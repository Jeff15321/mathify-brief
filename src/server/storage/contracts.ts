import type { AssetKind, CurrentWorkspace, MimeType, StoredAsset } from '@/types/domain';

export interface CurrentWorkspaceStore {
  read(): Promise<CurrentWorkspace | null>;
  write(workspace: CurrentWorkspace): Promise<void>;
  clear(): Promise<void>;
}

export interface AssetStore {
  put(input: {
    kind: AssetKind;
    fileName: string;
    mimeType: MimeType;
    bytes: Buffer;
  }): Promise<StoredAsset>;
  get(id: string): Promise<{ meta: StoredAsset; bytes: Buffer } | null>;
  remove(asset: StoredAsset): Promise<void>;
}
