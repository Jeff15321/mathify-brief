export type AssetKind = 'attachment' | 'whiteboard';
export type MimeType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';

export interface StoredAsset {
  id: string;
  kind: AssetKind;
  fileName: string;
  mimeType: MimeType;
  sizeBytes: number;
  createdAt: string;
}
