import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { currentWorkspaceSchema } from '@/schemas/workspace';
import type { CurrentWorkspace } from '@/types/domain';
import type { CurrentWorkspaceStore } from './contracts';

export class LocalWorkspaceStore implements CurrentWorkspaceStore {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'workspace.json');
  }

  async read(): Promise<CurrentWorkspace | null> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error('workspace.json is corrupt: not valid JSON');
    }

    const parsed = currentWorkspaceSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`workspace.json is corrupt: ${parsed.error.message}`);
    }
    return parsed.data as CurrentWorkspace;
  }

  async write(workspace: CurrentWorkspace): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    const tmpPath = `${this.filePath}.tmp.${crypto.randomUUID()}`;
    await writeFile(tmpPath, JSON.stringify(workspace, null, 2), 'utf-8');
    await rename(tmpPath, this.filePath);
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
  }
}
