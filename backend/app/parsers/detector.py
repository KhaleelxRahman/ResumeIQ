from __future__ import annotations

import zipfile
from dataclasses import dataclass
from pathlib import Path


DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB strict limit
MAX_DOCX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024  # 25 MB ZIP-bomb ceiling
MAX_DOCX_ENTRY_COUNT = 250
MAX_DOCX_COMPRESSION_RATIO = 120.0

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


def validate_file_signature(file_path: Path, extension: str) -> None:
    """Inspect binary magic bytes, OOXML structure, and ZIP-bomb safety."""
    if not file_path.exists() or file_path.stat().st_size == 0:
        raise DocumentValidationError(422, "EMPTY_DOCUMENT", "The uploaded file is empty.")

    with file_path.open("rb") as fh:
        head = fh.read(1024)

    if extension == "pdf":
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
    """Verify OOXML structure and guard against ZIP bombs, path traversal, and macros."""
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

            total_uncompressed = 0
            names: set[str] = set()
            for info in infos:
                normalized_entry = info.filename.replace("\\", "/")
                if normalized_entry.startswith("/") or ".." in normalized_entry.split("/"):
                    raise DocumentValidationError(
                        422,
                        "CORRUPTED_OR_UNSAFE_DOCUMENT",
                        "DOCX archive contains unsafe relative path entries.",
                    )

                if info.file_size < 0:
                    raise DocumentValidationError(422, "CORRUPTED_DOCUMENT", "DOCX archive entry size is invalid.")

                total_uncompressed += info.file_size
                if total_uncompressed > MAX_DOCX_UNCOMPRESSED_BYTES:
                    raise DocumentValidationError(
                        422,
                        "ZIP_BOMB_DETECTED",
                        "DOCX uncompressed content exceeds the 25 MB safety limit.",
                        {"uncompressed_bytes": total_uncompressed},
                    )

                if info.compress_size > 0 and info.file_size > 1_000_000:
                    ratio = info.file_size / info.compress_size
                    if ratio > MAX_DOCX_COMPRESSION_RATIO:
                        raise DocumentValidationError(
                            422,
                            "ZIP_BOMB_DETECTED",
                            "DOCX compression ratio exceeds safe decompression thresholds.",
                        )

                names.add(normalized_entry)

            if "word/document.xml" not in names:
                raise DocumentValidationError(
                    415,
                    "INVALID_OOXML_DOCUMENT",
                    "Archive is not a valid Word DOCX document (word/document.xml missing).",
                )

            if "word/vbaProject.bin" in names:
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
