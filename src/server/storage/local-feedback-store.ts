import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { feedbackReportIdSchema } from '@/schemas/feedback';
import type { FeedbackStore, SavedTutorFeedback } from './contracts';

/** Independent of workspace.json; writes are serialized by the workspace update lock. */
export class LocalFeedbackStore implements FeedbackStore {
  constructor(private dataDir: string) {}

  private dirPath() {
    return path.resolve(this.dataDir, 'feedback');
  }

  private filePath(reportId: string) {
    return path.resolve(this.dirPath(), `${feedbackReportIdSchema.parse(reportId)}.json`);
  }

  async read(reportId: string): Promise<SavedTutorFeedback | null> {
    try {
      return JSON.parse(await readFile(this.filePath(reportId), 'utf8')) as SavedTutorFeedback;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async write(feedback: SavedTutorFeedback): Promise<void> {
    const target = this.filePath(feedback.reportId);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.tmp.${randomUUID()}`;
    try {
      await writeFile(temporary, JSON.stringify(feedback, null, 2), 'utf8');
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async list(): Promise<SavedTutorFeedback[]> {
    let entries: string[];
    try {
      entries = await readdir(this.dirPath());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const items: SavedTutorFeedback[] = [];
    for (const name of entries) {
      if (!name.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(await readFile(path.resolve(this.dirPath(), name), 'utf8')) as SavedTutorFeedback;
        if (parsed && typeof parsed.accuracy === 'number' && typeof parsed.submittedAt === 'string') {
          items.push(parsed);
        }
      } catch {
        // Ignore malformed or partial files in the feedback directory.
      }
    }
    return items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
}
