import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface FeedbackEntry {
  overallUsefulness: number;
  breakdownAccuracy: number;
  probeQuality: number;
  comments: string;
  submittedAt: string;
}

const ENCODING = "utf-8";

/**
 * Simple JSON file storage for tutor feedback entries.
 * Persists under `data/feedback.json` in the local data directory.
 */
export class LocalFeedbackStore {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.resolve(dataDir, "feedback.json");
  }

  async getAll(): Promise<FeedbackEntry[]> {
    try {
      const raw = await readFile(this.filePath, ENCODING);
      return JSON.parse(raw) as FeedbackEntry[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  async add(entry: FeedbackEntry): Promise<void> {
    const entries = await this.getAll();
    entries.push(entry);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(entries, null, 2), ENCODING);
  }
}
