import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStores } from "@/server/storage";
import { startWorkspace } from "@/server/workspace-service";
import { ApiError } from "@/server/errors";
import { MAX_FILES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const PDF_BYTES = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from([1, 2, 3])]);

describe("Intake input validation", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-validation-"));
    stores = createStores(dataDir);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("accepts a typed-only question with no files", async () => {
    await startWorkspace({ questionText: "Solve 2(x + 3) = 14.", files: [] }, stores);
    const workspace = await stores.workspaceStore.read();
    expect(workspace?.questionText).toBe("Solve 2(x + 3) = 14.");
    expect(workspace?.attachments).toHaveLength(0);
  });

  it("accepts a mix of image and PDF attachments", async () => {
    await startWorkspace(
      {
        questionText: "",
        files: [
          { fileName: "work.png", mimeType: "image/png", bytes: PNG_BYTES },
          { fileName: "worksheet.pdf", mimeType: "application/pdf", bytes: PDF_BYTES },
        ],
      },
      stores,
    );
    const workspace = await stores.workspaceStore.read();
    expect(workspace?.attachments).toHaveLength(2);
  });

  it("rejects an empty submission (no text, no files)", async () => {
    await expect(startWorkspace({ questionText: "", files: [] }, stores)).rejects.toThrow(ApiError);
  });

  it("rejects a disallowed file type", async () => {
    await expect(
      startWorkspace(
        {
          questionText: "",
          files: [{ fileName: "notes.txt", mimeType: "text/plain", bytes: Buffer.from("hi") }],
        },
        stores,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("rejects a file whose bytes don't match its declared mime type", async () => {
    await expect(
      startWorkspace(
        {
          questionText: "",
          files: [{ fileName: "fake.png", mimeType: "image/png", bytes: Buffer.from("not a png") }],
        },
        stores,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("rejects a zero-byte file", async () => {
    await expect(
      startWorkspace(
        {
          questionText: "",
          files: [{ fileName: "empty.png", mimeType: "image/png", bytes: Buffer.alloc(0) }],
        },
        stores,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("enforces the per-question file count limit", async () => {
    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({
      fileName: `file${i}.png`,
      mimeType: "image/png" as const,
      bytes: PNG_BYTES,
    }));

    await expect(startWorkspace({ questionText: "", files }, stores)).rejects.toThrow(ApiError);
  });

  it("enforces the per-file size limit", async () => {
    const oversized = Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_FILE_SIZE_BYTES)]);

    await expect(
      startWorkspace(
        { questionText: "", files: [{ fileName: "big.png", mimeType: "image/png", bytes: oversized }] },
        stores,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("rejects question text over the maximum length", async () => {
    await expect(
      startWorkspace({ questionText: "a".repeat(5001), files: [] }, stores),
    ).rejects.toThrow(ApiError);
  });

  it("starting a new workspace replaces the previous one and cleans up its assets", async () => {
    await startWorkspace(
      { questionText: "first", files: [{ fileName: "a.png", mimeType: "image/png", bytes: PNG_BYTES }] },
      stores,
    );
    const first = await stores.workspaceStore.read();
    const firstAssetId = first!.attachments[0].id;

    await startWorkspace({ questionText: "second", files: [] }, stores);

    const second = await stores.workspaceStore.read();
    expect(second?.questionText).toBe("second");
    expect(await stores.assetStore.get(firstAssetId)).toBeNull();
  });
});
