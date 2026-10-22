import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { CURRENT_SCHEMA_VERSION, currentWorkspaceSchema } from '@/schemas/workspace';
import type { CurrentWorkspace } from '@/types/domain';
import type { CurrentWorkspaceStore, WorkspaceUpdater } from './contracts';

// Per-file write locks live on globalThis so every route bundle in the same Node process shares
// them (Next.js may load this module more than once). Single-process local dev only; a remote
// store needs a real transaction or row lock instead (see MVP_DESCRIPTION.md).
const globalLocks = globalThis as typeof globalThis & { __mathifyWorkspaceLocks?: Map<string, Promise<unknown>> };
const locks = (globalLocks.__mathifyWorkspaceLocks ??= new Map<string, Promise<unknown>>());

/**
 * Stores the singleton workspace as `workspace.json` under the data directory.
 * Writes are atomic (temp file + rename) and serialized per file through `update()`.
 */
export class LocalWorkspaceStore implements CurrentWorkspaceStore {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.resolve(dataDir, 'workspace.json');
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

    const version = (json as { schemaVersion?: unknown } | null)?.schemaVersion;
    if (version !== CURRENT_SCHEMA_VERSION) {
      // An older local demo workspace: treat it as absent so a new intake can replace it.
      console.warn(`Ignoring workspace.json with schemaVersion ${String(version)}; expected ${CURRENT_SCHEMA_VERSION}.`);
      return null;
    }

    const parsed = currentWorkspaceSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`workspace.json is corrupt: ${parsed.error.message}`);
    }
    return parsed.data as CurrentWorkspace;
  }

  async write(workspace: CurrentWorkspace): Promise<void> {
    await this.update(() => workspace);
  }

  async update(updater: WorkspaceUpdater): Promise<CurrentWorkspace> {
    const previous = locks.get(this.filePath) ?? Promise.resolve();
    const run = previous.then(async () => {
      const next = await updater(await this.read());
      await this.writeFileAtomic(next);
      return next;
    });
    // Keep the chain alive even when this update fails, so later updates still run.
    locks.set(this.filePath, run.catch(() => undefined));
    return run;
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
  }

  private async writeFileAtomic(workspace: CurrentWorkspace): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp.${crypto.randomUUID()}`;
    await writeFile(tmpPath, JSON.stringify(workspace, null, 2), 'utf-8');
    await rename(tmpPath, this.filePath);
  }
}
