import type { MimeType } from '@/types/domain';
import { ALLOWED_MIME_TYPES, MAX_FILES, MAX_FILE_SIZE_BYTES, MAX_TOTAL_SIZE_BYTES } from '@/lib/constants';

const SIGNATURE_CHECKS: Record<MimeType, (bytes: Buffer) => boolean> = {
  'image/png': (bytes) =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47,
  'image/jpeg': (bytes) =>
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/webp': (bytes) =>
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (bytes) => bytes.length >= 4 && bytes.subarray(0, 4).toString('ascii') === '%PDF',
};

export function isAllowedMimeType(mime: string): mime is MimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export interface UploadCandidate {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}

/** Validates one file: declared type allowed, signature matches, non-empty. Returns error messages. */
export function validateFileCandidate(file: UploadCandidate): string[] {
  const errors: string[] = [];

  if (file.bytes.byteLength === 0) {
    errors.push(`${file.fileName}: empty files are not allowed`);
    return errors;
  }

  if (!isAllowedMimeType(file.mimeType)) {
    errors.push(`${file.fileName}: unsupported file type "${file.mimeType}"`);
    return errors;
  }

  if (file.bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    errors.push(`${file.fileName}: exceeds maximum file size of ${MAX_FILE_SIZE_BYTES} bytes`);
  }

  const signatureOk = SIGNATURE_CHECKS[file.mimeType](file.bytes);
  if (!signatureOk) {
    errors.push(`${file.fileName}: file contents do not match declared type "${file.mimeType}"`);
  }

  return errors;
}

/** Validates the whole batch: count and combined size limits. Returns error messages. */
export function validateFileBatch(files: UploadCandidate[]): string[] {
  const errors: string[] = [];

  if (files.length > MAX_FILES) {
    errors.push(`At most ${MAX_FILES} files are allowed per question`);
  }

  const totalSize = files.reduce((sum, f) => sum + f.bytes.byteLength, 0);
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    errors.push(`Combined upload size exceeds ${MAX_TOTAL_SIZE_BYTES} bytes`);
  }

  for (const file of files) {
    errors.push(...validateFileCandidate(file));
  }

  return errors;
}
