import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { ApiError } from '../errors';
import type { MimeType, StoredAsset, TutorSession } from '@/types/domain';

export type WhiteboardMimeType = Exclude<MimeType, 'application/pdf'>;
export interface WhiteboardFile { fileName: string; mimeType: WhiteboardMimeType; bytes: Buffer }
export type SessionUpdater = (current: TutorSession) => TutorSession | Promise<TutorSession>;

const EXTENSION_BY_MIME: Record<WhiteboardMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Same per-file promise-chain lock as LocalWorkspaceStore (single-process local dev only).
const globalLocks = globalThis as typeof globalThis & { __mathifySessionLocks?: Map<string, Promise<unknown>> };
const locks = (globalLocks.__mathifySessionLocks ??= new Map<string, Promise<unknown>>());

/**
 * Stores each session as `sessions/<id>.json` plus whiteboards in `sessions/<id>/<assetId>.<ext>`.
 * Never goes through AssetStore/workspace.json, so a new intake cannot delete session files.
 */
export class LocalSessionStore {
  private sessionsDir: string;

  constructor(dataDir: string) {
    this.sessionsDir = path.resolve(dataDir, 'sessions');
  }

  private validId(id: string): string {
    const parsed = z.uuid().safeParse(id);
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Invalid session id');
    return parsed.data;
  }

  private jsonPath(id: string) {
    return path.join(/* turbopackIgnore: true */ this.sessionsDir, `${this.validId(id)}.json`);
  }

  private assetPath(id: string, asset: StoredAsset) {
    const extension = EXTENSION_BY_MIME[asset.mimeType as WhiteboardMimeType];
    return path.join(/* turbopackIgnore: true */ this.sessionsDir, this.validId(id), `${this.validId(asset.id)}.${extension}`);
  }

  private withLock<T>(id: string, task: () => Promise<T>): Promise<T> {
    const key = this.jsonPath(id);
    const run = (locks.get(key) ?? Promise.resolve()).then(task);
    // Keep the chain alive even when this task fails, so later tasks still run.
    locks.set(key, run.catch(() => undefined));
    return run;
  }

  async list(): Promise<TutorSession[]> {
    let names: string[];
    try {
      names = await readdir(this.sessionsDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const ids = names.filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -'.json'.length));
    const sessions = await Promise.all(ids.filter((id) => z.uuid().safeParse(id).success).map((id) => this.read(id)));
    return sessions
      .filter((session): session is TutorSession => session !== null)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async read(id: string): Promise<TutorSession | null> {
    try {
      return JSON.parse(await readFile(this.jsonPath(id), 'utf8')) as TutorSession;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  /** Writes the whiteboard files, then the session JSON with their asset metadata. */
  async create(session: Omit<TutorSession, 'whiteboards'>, whiteboardFiles: WhiteboardFile[]): Promise<TutorSession> {
    return this.withLock(session.id, async () => {
      const whiteboards: StoredAsset[] = [];
      for (const file of whiteboardFiles) {
        const asset: StoredAsset = {
          id: randomUUID(),
          kind: 'whiteboard',
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.bytes.byteLength,
          createdAt: new Date().toISOString(),
        };
        const target = this.assetPath(session.id, asset);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, file.bytes);
        whiteboards.push(asset);
      }
      const created: TutorSession = { ...session, whiteboards };
      await this.writeAtomic(created);
      return created;
    });
  }

  /** Serialized read-modify-write; throwing from `updater` aborts without writing. */
  async update(id: string, updater: SessionUpdater): Promise<TutorSession> {
    return this.withLock(id, async () => {
      const current = await this.read(id);
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Session not found');
      const next = await updater(current);
      await this.writeAtomic({ ...next, id: current.id });
      return next;
    });
  }

  async remove(id: string): Promise<void> {
    await this.withLock(id, async () => {
      await rm(this.jsonPath(id), { force: true });
      await rm(path.join(/* turbopackIgnore: true */ this.sessionsDir, this.validId(id)), { recursive: true, force: true });
    });
  }

  async readAsset(id: string, assetId: string): Promise<{ meta: StoredAsset; bytes: Buffer } | null> {
    const meta = (await this.read(id))?.whiteboards.find((asset) => asset.id === assetId);
    if (!meta) return null;
    try {
      return { meta, bytes: await readFile(this.assetPath(id, meta)) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private async writeAtomic(session: TutorSession): Promise<void> {
    const target = this.jsonPath(session.id);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.tmp.${randomUUID()}`;
    try {
      await writeFile(temporary, JSON.stringify(session, null, 2), 'utf8');
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
