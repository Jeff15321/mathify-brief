export const MAX_FILES = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
export const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024; // 20 MiB
export const MAX_QUESTION_TEXT_LENGTH = 5000;
export const MAX_WHITEBOARD_SIZE_BYTES = 4 * 1024 * 1024; // 4 MiB

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export const GRADE = 9;
