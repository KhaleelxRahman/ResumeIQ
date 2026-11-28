from __future__ import annotations

import zipfile
from dataclasses import dataclass
from pathlib import Path


DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB strict limit
MAX_DOCX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024  # 25 MB ZIP-bomb ceiling
MAX_DOCX_SINGLE_ENTRY_BYTES = 12 * 1024 * 1024  # 12 MB single XML/asset ceiling
MAX_DOCX_ENTRY_COUNT = 250
MAX_DOCX_COMPRESSION_RATIO = 120.0
MIN_DOCX_RATIO_CHECK_BYTES = 4096
_STREAM_READ_CHUNK_BYTES = 65536

ALLOWED_EXTENSIONS = {"pdf", "docx"}

ALLOWED_PDF_MIMES = {
    "",
    "application/pdf",
    "application/x-pdf",
    "application/octet-stream",
}
ALLOWED_DOCX_MIMES = {
    "",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
}

_OLE2_HEADER = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
_ZIP_LOCAL_HEADER = b"PK\x03\x04"
_DISALLOWED_MAGIC_PREFIXES = (
    (b"MZ", "executable binary"),
    (b"\x7fELF", "ELF binary"),
    (b"\x89PNG\r\n\x1a\n", "PNG image"),
    (b"\xff\xd8\xff", "JPEG image"),
    (b"GIF87a", "GIF image"),
    (b"GIF89a", "GIF image"),
    (b"{\\rtf", "RTF document"),
)


class DocumentValidationError(Exception):
    """Domain validation error cleanly mapped to typed HTTP error envelopes."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


@dataclass(frozen=True, slots=True)
class ValidatedUploadMeta:
    extension: str
    safe_display_name: str
    size_bytes: int
    content_type: str


def sanitize_display_filename(filename: str | None) -> str:
    """Return a clean basename safe for UI display metadata (never used for disk paths)."""
    if not filename:
        return "uploaded_resume"
    base = Path(filename.replace("\\", "/")).name.strip()
    cleaned = "".join(ch if ch.isalnum() or ch in {".", "-", "_"} else "_" for ch in base)
    return cleaned[:160] or "uploaded_resume"


def validate_upload_metadata(
    filename: str | None,
    content_type: str | None,
    size_bytes: int,
    max_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
) -> ValidatedUploadMeta:
    """Validate file extension, reported MIME type, non-empty payload, and 5 MB limit."""
    if not filename or not filename.strip():
        raise DocumentValidationError(400, "MISSING_FILENAME", "Uploaded file must include a filename.")

    safe_name = sanitize_display_filename(filename)
    ext = Path(safe_name).suffix.lower().lstrip(".")
    if ext not in ALLOWED_EXTENSIONS:
        raise DocumentValidationError(
            415,
            "UNSUPPORTED_FILE_TYPE",
            "Only PDF (.pdf) and Word (.docx) resumes are supported.",
            {"extension": ext or "none"},
        )

    if size_bytes <= 0:
        raise DocumentValidationError(422, "EMPTY_DOCUMENT", "The uploaded file is empty (0 bytes).")

    if size_bytes > max_bytes:
        raise DocumentValidationError(
            413,
            "FILE_TOO_LARGE",
            f"Uploaded file exceeds the {max_bytes // (1024 * 1024)} MB maximum limit.",
            {"size_bytes": size_bytes, "max_bytes": max_bytes},
        )

    mime = (content_type or "").split(";")[0].strip().lower()
    allowed_mimes = ALLOWED_PDF_MIMES if ext == "pdf" else ALLOWED_DOCX_MIMES
    if mime not in allowed_mimes:
        raise DocumentValidationError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            f"Content-Type '{mime}' does not match expected .{ext} document type.",
            {"content_type": mime, "extension": ext},
        )

    return ValidatedUploadMeta(
        extension=ext,
        safe_display_name=safe_name,
        size_bytes=size_bytes,
        content_type=mime,
    )


def _reject_disguised_binary_header(head: bytes, expected_extension: str) -> None:
    """Reject spoofed binary or markup signatures independently of client Content-Type headers."""
    for prefix, label in _DISALLOWED_MAGIC_PREFIXES:
        if head.startswith(prefix):
            raise DocumentValidationError(
                415,
                "INVALID_FILE_SIGNATURE",
                f"Uploaded payload is a {label}, not a valid .{expected_extension} resume.",
                {"detected_format": label, "expected_extension": expected_extension},
            )

    stripped_lower = head.lstrip().lower()
    if stripped_lower.startswith((b"<!doctype", b"<html", b"<script", b"<svg", b"<?xml")):
        raise DocumentValidationError(
            415,
            "INVALID_FILE_SIGNATURE",
            f"Uploaded markup/script payload is not a valid .{expected_extension} resume.",
            {"expected_extension": expected_extension},
        )


def validate_file_signature(file_path: Path, extension: str) -> None:
    """Inspect binary magic bytes, OOXML structure, and bounded ZIP decompression safety."""
    if not file_path.exists() or file_path.stat().st_size == 0:
        raise DocumentValidationError(422, "EMPTY_DOCUMENT", "The uploaded file is empty.")

    with file_path.open("rb") as fh:
        head = fh.read(1024)

    _reject_disguised_binary_header(head, expected_extension=extension)

    if extension == "pdf":
        if head.startswith(_ZIP_LOCAL_HEADER):
            raise DocumentValidationError(
                415,
                "INVALID_FILE_SIGNATURE",
                "Uploaded bytes appear to be a ZIP/DOCX container rather than a PDF document.",
                {"expected_extension": "pdf"},
            )
        # PDF spec allows leading whitespace/BOM before %PDF- within first 1024 bytes.
        if b"%PDF-" not in head:
            raise DocumentValidationError(
                415,
                "INVALID_FILE_SIGNATURE",
                "File signature does not match a valid PDF document (%PDF- header missing).",
            )
        return

    if extension == "docx":
        if head.startswith(_OLE2_HEADER):
            raise DocumentValidationError(
                422,
                "ENCRYPTED_OR_LEGACY_DOC",
                "Legacy .doc or password-encrypted Office files are not supported. Export an unencrypted .docx file.",
            )

        if b"%PDF-" in head[:16]:
            raise DocumentValidationError(
                415,
                "INVALID_FILE_SIGNATURE",
                "Uploaded bytes match a PDF document rather than a DOCX OOXML archive.",
                {"expected_extension": "docx"},
            )

        if not head.startswith(_ZIP_LOCAL_HEADER):
            raise DocumentValidationError(
                415,
                "INVALID_FILE_SIGNATURE",
                "File signature does not match a valid DOCX (OOXML ZIP) container.",
            )

        _validate_ooxml_zip_safety(file_path)
        return

    raise DocumentValidationError(415, "UNSUPPORTED_FILE_TYPE", f"Unsupported file extension '.{extension}'.")


def _validate_ooxml_zip_safety(file_path: Path) -> None:
    """
    Verify OOXML structure by streaming actual decompressed entry bytes rather
    than trusting central-directory metadata alone. Blocks ZIP bombs across both
    small and large entries, XML entity bombs, path traversal, and macros.
    """
    try:
        with zipfile.ZipFile(file_path, "r") as zf:
            infos = zf.infolist()
            if len(infos) == 0:
                raise DocumentValidationError(422, "CORRUPTED_DOCUMENT", "DOCX archive contains no entries.")
            if len(infos) > MAX_DOCX_ENTRY_COUNT:
                raise DocumentValidationError(
                    422,
                    "ZIP_BOMB_DETECTED",
                    "DOCX archive exceeds safe internal file count limits.",
                    {"entry_count": len(infos), "max_entries": MAX_DOCX_ENTRY_COUNT},
                )

            actual_total_uncompressed = 0
            declared_total_uncompressed = 0
            names_lower: set[str] = set()

            for info in infos:
                normalized_entry = info.filename.replace("\\", "/")
                if (
                    normalized_entry.startswith("/")
                    or ":" in normalized_entry
                    or ".." in normalized_entry.split("/")
                ):
                    raise DocumentValidationError(
                        422,
                        "CORRUPTED_OR_UNSAFE_DOCUMENT",
                        "DOCX archive contains unsafe relative or absolute path entries.",
                    )

                if info.flag_bits & 0x1:
                    raise DocumentValidationError(
                        422,
                        "ENCRYPTED_DOCUMENT_UNSUPPORTED",
                        "Password-protected or encrypted DOCX archives are not supported.",
                    )

                if info.file_size < 0 or info.compress_size < 0:
                    raise DocumentValidationError(422, "CORRUPTED_DOCUMENT", "DOCX archive entry size is invalid.")

                declared_total_uncompressed += info.file_size
                if declared_total_uncompressed > MAX_DOCX_UNCOMPRESSED_BYTES:
                    raise DocumentValidationError(
                        422,
                        "ZIP_BOMB_DETECTED",
                        "DOCX uncompressed content exceeds the 25 MB safety limit.",
                        {"uncompressed_bytes": declared_total_uncompressed},
                    )

                names_lower.add(normalized_entry.lower())

                is_xml_like = normalized_entry.lower().endswith((".xml", ".rels"))
                entry_actual = 0
                prev_tail = b""

                try:
                    with zf.open(info, "r") as entry_fh:
                        while True:
                            chunk = entry_fh.read(_STREAM_READ_CHUNK_BYTES)
                            if not chunk:
                                break
                            entry_actual += len(chunk)
                            actual_total_uncompressed += len(chunk)

                            if (
                                entry_actual > MAX_DOCX_SINGLE_ENTRY_BYTES
                                or actual_total_uncompressed > MAX_DOCX_UNCOMPRESSED_BYTES
                            ):
                                raise DocumentValidationError(
                                    422,
                                    "ZIP_BOMB_DETECTED",
                                    "DOCX actual decompressed stream exceeds safe size limits.",
                                    {"uncompressed_bytes": actual_total_uncompressed},
                                )

                            if is_xml_like:
                                window = (prev_tail + chunk).upper()
                                if b"<!ENTITY" in window or b"<!DOCTYPE" in window:
                                    raise DocumentValidationError(
                                        422,
                                        "CORRUPTED_OR_UNSAFE_DOCUMENT",
                                        "DOCX XML contains unsafe DOCTYPE/ENTITY declarations.",
                                    )
                                prev_tail = chunk[-32:]
                except RuntimeError as exc:
                    raise DocumentValidationError(
                        422,
                        "ENCRYPTED_DOCUMENT_UNSUPPORTED",
                        "DOCX archive entry could not be decrypted cleanly.",
                    ) from exc

                if entry_actual >= MIN_DOCX_RATIO_CHECK_BYTES:
                    if info.compress_size == 0 and info.compress_type != zipfile.ZIP_STORED:
                        raise DocumentValidationError(
                            422,
                            "ZIP_BOMB_DETECTED",
                            "DOCX archive entry contains inconsistent compressed size headers.",
                        )
                    if info.compress_size > 0:
                        actual_ratio = entry_actual / info.compress_size
                        if actual_ratio > MAX_DOCX_COMPRESSION_RATIO:
                            raise DocumentValidationError(
                                422,
                                "ZIP_BOMB_DETECTED",
                                "DOCX compression ratio exceeds safe decompression thresholds.",
                                {"compression_ratio": round(actual_ratio, 1)},
                            )

            if "word/document.xml" not in names_lower:
                raise DocumentValidationError(
                    415,
                    "INVALID_OOXML_DOCUMENT",
                    "Archive is not a valid Word DOCX document (word/document.xml missing).",
                )

            if any(name.endswith("vbaproject.bin") for name in names_lower):
                raise DocumentValidationError(
                    415,
                    "MACRO_ENABLED_DOCUMENT_UNSUPPORTED",
                    "Macro-enabled Word documents are not accepted for security reasons.",
                )

    except zipfile.BadZipFile as exc:
        raise DocumentValidationError(
            422,
            "CORRUPTED_DOCUMENT",
            "Uploaded DOCX file appears corrupted and could not be opened.",
        ) from exc
