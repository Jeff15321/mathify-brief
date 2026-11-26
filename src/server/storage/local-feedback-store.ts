import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { feedbackReportIdSchema } from '@/schemas/feedback';
import type { FeedbackStore, SavedTutorFeedback } from './contracts';

/** Independent of workspace.json; writes are serialized by the workspace update lock. */
export class LocalFeedbackStore implements FeedbackStore {
  constructor(private dataDir: string) {}

  private filePath(reportId: string) {
    return path.resolve(this.dataDir, 'feedback', `${feedbackReportIdSchema.parse(reportId)}.json`);
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
}
