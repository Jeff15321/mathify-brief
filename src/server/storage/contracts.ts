import type { AssetKind, CurrentWorkspace, MimeType, StoredAsset } from '@/types/domain';

/** Updater for `CurrentWorkspaceStore.update`: receives the current workspace and returns the next one. */
export type WorkspaceUpdater = (current: CurrentWorkspace | null) => CurrentWorkspace | Promise<CurrentWorkspace>;

export interface CurrentWorkspaceStore {
  read(): Promise<CurrentWorkspace | null>;
  write(workspace: CurrentWorkspace): Promise<void>;
  /**
   * Serialized read-modify-write. Concurrent calls (e.g. probe generation and an answer) never
   * overwrite each other. Throwing from `updater` aborts without writing. Never call the store
   * from inside `updater`, and keep slow work (AI calls) outside it.
   */
  update(updater: WorkspaceUpdater): Promise<CurrentWorkspace>;
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
