import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStores } from "@/server/storage";
import { startWorkspace } from "@/server/workspace-service";
import { analyzeCurrentWorkspace } from "@/server/analysis-service";

export type Stores = ReturnType<typeof createStores>;

/**
 * Creates isolated temp storage with mock AI and, unless `analyze` is false, an analyzed workspace.
 * @returns The stores plus a cleanup function for afterEach.
 */
export async function setupWorkspace(
  prefix: string,
  { analyze = true }: { analyze?: boolean } = {},
): Promise<{ stores: Stores; cleanup: () => Promise<void> }> {
  process.env.AI_MOCK_MODE = "true";
  const dataDir = await mkdtemp(path.join(tmpdir(), `mathify-${prefix}-`));
  const stores = createStores(dataDir);
  await startWorkspace({ questionText: "Solve 2(x + 3) = 14.", files: [] }, stores);
  if (analyze) await analyzeCurrentWorkspace(stores);
  return { stores, cleanup: () => rm(dataDir, { recursive: true, force: true }) };
}
