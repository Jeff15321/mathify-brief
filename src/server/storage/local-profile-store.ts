import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { LearnerProfile } from '@/types/domain';

export type ProfileUpdater = (current: LearnerProfile) => LearnerProfile | Promise<LearnerProfile>;

// Same per-file promise-chain lock as LocalSessionStore (single-process local dev only).
const globalLocks = globalThis as typeof globalThis & { __mathifyProfileLocks?: Map<string, Promise<unknown>> };
const locks = (globalLocks.__mathifyProfileLocks ??= new Map<string, Promise<unknown>>());

export function emptyLearnerProfile(): LearnerProfile {
  return {
    schemaVersion: 1, nextFocus: '', nextFocusSource: 'ai', items: [], tutorNotes: '', updatedAt: new Date().toISOString(),
    rebuiltAt: null, rebuildStatus: 'idle', model: null, promptVersion: null,
  };
}

/** Stores the single learner profile as `learner-profile.json`. */
export class LocalProfileStore {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.resolve(dataDir, 'learner-profile.json');
  }

  /** @returns The stored profile, or an empty one when none was saved yet. */
  async read(): Promise<LearnerProfile> {
    try {
      return JSON.parse(await readFile(this.filePath, 'utf8')) as LearnerProfile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyLearnerProfile();
      throw error;
    }
  }

  /** Serialized read-modify-write; throwing from `updater` aborts without writing. */
  async update(updater: ProfileUpdater): Promise<LearnerProfile> {
    const run = (locks.get(this.filePath) ?? Promise.resolve()).then(async () => {
      const next = await updater(await this.read());
      await this.writeAtomic(next);
      return next;
    });
    // Keep the chain alive even when this task fails, so later tasks still run.
    locks.set(this.filePath, run.catch(() => undefined));
    return run;
  }

  private async writeAtomic(profile: LearnerProfile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp.${randomUUID()}`;
    try {
      await writeFile(temporary, JSON.stringify(profile, null, 2), 'utf8');
      await rename(temporary, this.filePath);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
