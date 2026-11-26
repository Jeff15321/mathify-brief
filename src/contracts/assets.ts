export const ASSET_KINDS = ['attachment', 'whiteboard'] as const;
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];
export type MimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isImageMimeType(mime: string): mime is ImageMimeType {
  return IMAGE_MIME_TYPES.some(type => type === mime);
}

export function isAllowedMimeType(mime: string): mime is MimeType {
  return ALLOWED_MIME_TYPES.some(type => type === mime);
}

export interface StoredAsset {
  id: string;
  kind: AssetKind;
  fileName: string;
  mimeType: MimeType;
  sizeBytes: number;
  createdAt: string;
}
