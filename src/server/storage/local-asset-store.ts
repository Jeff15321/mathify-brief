import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AssetKind, MimeType, StoredAsset } from '@/types/domain';
import type { AssetStore, CurrentWorkspaceStore } from './contracts';

const EXTENSION_BY_MIME: Record<MimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export class LocalAssetStore implements AssetStore {
  private uploadsDir: string;

  constructor(
    dataDir: string,
    private workspaceStore: CurrentWorkspaceStore,
  ) {
    this.uploadsDir = path.join(dataDir, 'uploads');
  }

  private pathFor(id: string, mimeType: MimeType): string {
    // Local-dev-only disk access (never deployed to Vercel as-is, see MVP_DESCRIPTION.md
    // Section 0); opt out of Turbopack's output file tracing for this dynamic path.
    return path.join(/* turbopackIgnore: true */ this.uploadsDir, `${id}.${EXTENSION_BY_MIME[mimeType]}`);
  }

  async put(input: {
    kind: AssetKind;
    fileName: string;
    mimeType: MimeType;
    bytes: Buffer;
  }): Promise<StoredAsset> {
    await mkdir(this.uploadsDir, { recursive: true });
    const id = crypto.randomUUID();
    const filePath = this.pathFor(id, input.mimeType);
    await writeFile(filePath, input.bytes);

    return {
      id,
      kind: input.kind,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      createdAt: new Date().toISOString(),
    };
  }

  async get(id: string): Promise<{ meta: StoredAsset; bytes: Buffer } | null> {
    const workspace = await this.workspaceStore.read();
    if (!workspace) return null;

    const meta =
      workspace.attachments.find((asset) => asset.id === id) ??
      (workspace.whiteboardAsset?.id === id ? workspace.whiteboardAsset : null);
    if (!meta) return null;

    const filePath = this.pathFor(meta.id, meta.mimeType);
    try {
      const bytes = await readFile(filePath);
      return { meta, bytes };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  async remove(asset: StoredAsset): Promise<void> {
    const filePath = this.pathFor(asset.id, asset.mimeType);
    await rm(filePath, { force: true });
  }
}
