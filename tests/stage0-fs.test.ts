import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("Stage 0: Node filesystem smoke test", () => {
  it("writes, reads, and deletes a file in an isolated temp directory", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mathify-stage0-"));
    const filePath = path.join(dir, "smoke.txt");

    await writeFile(filePath, "stage0-ok", "utf-8");
    const contents = await readFile(filePath, "utf-8");
    expect(contents).toBe("stage0-ok");

    await rm(dir, { recursive: true, force: true });
    await expect(readFile(filePath, "utf-8")).rejects.toThrow();
  });
});
