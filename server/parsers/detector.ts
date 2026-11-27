import path from 'node:path';
import JSZip from 'jszip';
import { ApiError } from '../types.js';

export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_DOCX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
export const MAX_DOCX_SINGLE_ENTRY_BYTES = 12 * 1024 * 1024;
export const MAX_DOCX_ENTRY_COUNT = 250;
export const MAX_DOCX_COMPRESSION_RATIO = 120.0;
export const MIN_DOCX_RATIO_CHECK_BYTES = 4096;

export const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx']);

const ALLOWED_PDF_MIMES = new Set([
  '',
  'application/pdf',
  'application/x-pdf',
  'application/octet-stream',
]);

const ALLOWED_DOCX_MIMES = new Set([
  '',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

const OLE2_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_LOCAL_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const DISALLOWED_MAGIC_PREFIXES: Array<[Buffer, string]> = [
  [Buffer.from('MZ'), 'executable binary'],
  [Buffer.from([0x7f, 0x45, 0x4c, 0x46]), 'ELF binary'],
  [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'PNG image'],
  [Buffer.from([0xff, 0xd8, 0xff]), 'JPEG image'],
  [Buffer.from('GIF87a'), 'GIF image'],
  [Buffer.from('GIF89a'), 'GIF image'],
  [Buffer.from('{\\rtf'), 'RTF document'],
];

export interface ValidatedUploadMeta {
  extension: 'pdf' | 'docx';
  safe_display_name: string;
  size_bytes: number;
  content_type: string;
}

export function sanitizeDisplayFilename(filename?: string | null): string {
  if (!filename) return 'uploaded_resume';
  const base = path.basename(filename.replace(/\\/g, '/')).trim();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 160) || 'uploaded_resume';
}

export function validateUploadMetadata(
  filename: string | undefined,
  contentType: string | undefined,
  sizeBytes: number,
  maxBytes = DEFAULT_MAX_UPLOAD_BYTES,
): ValidatedUploadMeta {
  if (!filename || !filename.trim()) {
    throw new ApiError(400, 'MISSING_FILENAME', 'Uploaded file must include a filename.');
  }

  const safeName = sanitizeDisplayFilename(filename);
  const ext = path.extname(safeName).toLowerCase().replace(/^\./, '');
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ApiError(
      415,
      'UNSUPPORTED_FILE_TYPE',
      'Only PDF (.pdf) and Word (.docx) resumes are supported.',
      { extension: ext || 'none' },
    );
  }

  if (sizeBytes <= 0) {
    throw new ApiError(422, 'EMPTY_DOCUMENT', 'The uploaded file is empty (0 bytes).');
  }

  if (sizeBytes > maxBytes) {
    throw new ApiError(
      413,
      'FILE_TOO_LARGE',
      `Uploaded file exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB maximum limit.`,
      { size_bytes: sizeBytes, max_bytes: maxBytes },
    );
  }

  const mime = (contentType ?? '').split(';')[0].trim().toLowerCase();
  const allowedMimes = ext === 'pdf' ? ALLOWED_PDF_MIMES : ALLOWED_DOCX_MIMES;
  if (!allowedMimes.has(mime)) {
    throw new ApiError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      `Content-Type '${mime}' does not match expected .${ext} document type.`,
      { content_type: mime, extension: ext },
    );
  }

  return {
    extension: ext as 'pdf' | 'docx',
    safe_display_name: safeName,
    size_bytes: sizeBytes,
    content_type: mime,
  };
}

function rejectDisguisedBinaryHeader(head: Buffer, expectedExtension: string): void {
  for (const [prefix, label] of DISALLOWED_MAGIC_PREFIXES) {
    if (head.subarray(0, prefix.length).equals(prefix)) {
      throw new ApiError(
        415,
        'INVALID_FILE_SIGNATURE',
        `Uploaded payload is a ${label}, not a valid .${expectedExtension} resume.`,
        { detected_format: label, expected_extension: expectedExtension },
      );
    }
  }

  const strippedLower = head.toString('utf-8').trimStart().toLowerCase();
  if (
    strippedLower.startsWith('<!doctype') ||
    strippedLower.startsWith('<html') ||
    strippedLower.startsWith('<script') ||
    strippedLower.startsWith('<svg') ||
    strippedLower.startsWith('<?xml')
  ) {
    throw new ApiError(
      415,
      'INVALID_FILE_SIGNATURE',
      `Uploaded markup/script payload is not a valid .${expectedExtension} resume.`,
      { expected_extension: expectedExtension },
    );
  }
}

export async function validateFileSignature(
  buffer: Buffer,
  extension: 'pdf' | 'docx',
): Promise<JSZip | null> {
  if (!buffer || buffer.length === 0) {
    throw new ApiError(422, 'EMPTY_DOCUMENT', 'The uploaded file is empty.');
  }

  const head = buffer.subarray(0, 1024);
  rejectDisguisedBinaryHeader(head, extension);

  if (extension === 'pdf') {
    if (head.subarray(0, ZIP_LOCAL_HEADER.length).equals(ZIP_LOCAL_HEADER)) {
      throw new ApiError(
        415,
        'INVALID_FILE_SIGNATURE',
        'Uploaded bytes appear to be a ZIP/DOCX container rather than a PDF document.',
        { expected_extension: 'pdf' },
      );
    }
    if (!head.includes(Buffer.from('%PDF-'))) {
      throw new ApiError(
        415,
        'INVALID_FILE_SIGNATURE',
        'File signature does not match a valid PDF document (%PDF- header missing).',
      );
    }
    return null;
  }

  if (extension === 'docx') {
    if (head.subarray(0, OLE2_HEADER.length).equals(OLE2_HEADER)) {
      throw new ApiError(
        422,
        'ENCRYPTED_OR_LEGACY_DOC',
        'Legacy .doc or password-encrypted Office files are not supported. Export an unencrypted .docx file.',
      );
    }
    if (head.subarray(0, 16).includes(Buffer.from('%PDF-'))) {
      throw new ApiError(
        415,
        'INVALID_FILE_SIGNATURE',
        'Uploaded bytes match a PDF document rather than a DOCX OOXML archive.',
        { expected_extension: 'docx' },
      );
    }
    if (!head.subarray(0, ZIP_LOCAL_HEADER.length).equals(ZIP_LOCAL_HEADER)) {
      throw new ApiError(
        415,
        'INVALID_FILE_SIGNATURE',
        'File signature does not match a valid DOCX (OOXML ZIP) container.',
      );
    }
    return await validateOoxmlZipSafety(buffer);
  }

  throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', `Unsupported file extension '.${extension}'.`);
}

async function validateOoxmlZipSafety(buffer: Buffer): Promise<JSZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ApiError(
      422,
      'CORRUPTED_DOCUMENT',
      'Uploaded DOCX file appears corrupted and could not be opened.',
    );
  }

  const entries = Object.values(zip.files);
  if (entries.length === 0) {
    throw new ApiError(422, 'CORRUPTED_DOCUMENT', 'DOCX archive contains no entries.');
  }
  if (entries.length > MAX_DOCX_ENTRY_COUNT) {
    throw new ApiError(
      422,
      'ZIP_BOMB_DETECTED',
      'DOCX archive exceeds safe internal file count limits.',
      { entry_count: entries.length, max_entries: MAX_DOCX_ENTRY_COUNT },
    );
  }

  let actualTotalUncompressed = 0;
  const namesLower = new Set<string>();

  for (const entry of entries) {
    const normalized = entry.name.replace(/\\/g, '/');
    if (
      normalized.startsWith('/') ||
      normalized.includes(':') ||
      normalized.split('/').includes('..')
    ) {
      throw new ApiError(
        422,
        'CORRUPTED_OR_UNSAFE_DOCUMENT',
        'DOCX archive contains unsafe relative or absolute path entries.',
      );
    }

    namesLower.add(normalized.toLowerCase());
    if (entry.dir) continue;

    let data: Uint8Array;
    try {
      data = await entry.async('uint8array');
    } catch {
      throw new ApiError(
        422,
        'ENCRYPTED_DOCUMENT_UNSUPPORTED',
        'DOCX archive entry could not be decrypted cleanly.',
      );
    }

    actualTotalUncompressed += data.byteLength;
    if (
      data.byteLength > MAX_DOCX_SINGLE_ENTRY_BYTES ||
      actualTotalUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES
    ) {
      throw new ApiError(
        422,
        'ZIP_BOMB_DETECTED',
        'DOCX actual decompressed stream exceeds safe size limits.',
        { uncompressed_bytes: actualTotalUncompressed },
      );
    }

    const lowerName = normalized.toLowerCase();
    if (lowerName.endsWith('.xml') || lowerName.endsWith('.rels')) {
      const upperXml = Buffer.from(data).toString('utf-8').toUpperCase();
      if (upperXml.includes('<!ENTITY') || upperXml.includes('<!DOCTYPE')) {
        throw new ApiError(
          422,
          'CORRUPTED_OR_UNSAFE_DOCUMENT',
          'DOCX XML contains unsafe DOCTYPE/ENTITY declarations.',
        );
      }
    }
  }

  if (!namesLower.has('word/document.xml')) {
    throw new ApiError(
      415,
      'INVALID_OOXML_DOCUMENT',
      'Archive is not a valid Word DOCX document (word/document.xml missing).',
    );
  }

  for (const name of namesLower) {
    if (name.endsWith('vbaproject.bin')) {
      throw new ApiError(
        415,
        'MACRO_ENABLED_DOCUMENT_UNSUPPORTED',
        'Macro-enabled Word documents are not accepted for security reasons.',
      );
    }
  }

  return zip;
}
