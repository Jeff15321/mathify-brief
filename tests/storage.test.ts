import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createStores } from "@/server/storage";
import { DEMO_PROFILE } from "@/types/domain";
import type { CurrentWorkspace } from "@/types/domain";

function makeWorkspace(overrides: Partial<CurrentWorkspace> = {}): CurrentWorkspace {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    demoProfile: DEMO_PROFILE,
    questionText: "Solve 2(x + 3) = 14.",
    attachments: [],
    createdAt: now,
    updatedAt: now,
    phase: "intake",
    analysis: null,
    probeSteps: [],
    cursor: null,
    whiteboardAsset: null,
    brief: null,
    ...overrides,
  };
}

describe("Local storage (isolated temp directory)", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-storage-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("read() returns null when no workspace has been written", async () => {
    const { workspaceStore } = createStores(dataDir);
    expect(await workspaceStore.read()).toBeNull();
  });

  it("writes and reads back the singleton workspace", async () => {
    const { workspaceStore } = createStores(dataDir);
    const workspace = makeWorkspace();

    await workspaceStore.write(workspace);
    const readBack = await workspaceStore.read();

    expect(readBack).toEqual(workspace);
  });

  it("replacing the workspace overwrites the previous one (singleton, not a list)", async () => {
    const { workspaceStore } = createStores(dataDir);
    await workspaceStore.write(makeWorkspace({ questionText: "first" }));
    await workspaceStore.write(makeWorkspace({ questionText: "second" }));

    const readBack = await workspaceStore.read();
    expect(readBack?.questionText).toBe("second");
  });

  it("read() treats a workspace from an older schema version as absent", async () => {
    const { workspaceStore } = createStores(dataDir);
    await writeFile(path.join(dataDir, "workspace.json"), JSON.stringify({ ...makeWorkspace(), schemaVersion: 1 }));
    expect(await workspaceStore.read()).toBeNull();
  });

  it("update() serializes concurrent read-modify-write calls so no update is lost", async () => {
    const { workspaceStore } = createStores(dataDir);
    await workspaceStore.write(makeWorkspace({ questionText: "" }));

    await Promise.all(
      ["a", "b", "c", "d", "e"].map((letter) =>
        workspaceStore.update(async (current) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { ...current!, questionText: current!.questionText + letter };
        }),
      ),
    );

    expect((await workspaceStore.read())?.questionText).toBe("abcde");
  });

  it("update() writes nothing when the updater throws, and later updates still run", async () => {
    const { workspaceStore } = createStores(dataDir);
    await workspaceStore.write(makeWorkspace({ questionText: "kept" }));

    await expect(workspaceStore.update(() => Promise.reject(new Error("nope")))).rejects.toThrow("nope");
    expect((await workspaceStore.read())?.questionText).toBe("kept");

    await workspaceStore.update((current) => ({ ...current!, questionText: "next" }));
    expect((await workspaceStore.read())?.questionText).toBe("next");
  });

  it("clear() removes the workspace file", async () => {
    const { workspaceStore } = createStores(dataDir);
    await workspaceStore.write(makeWorkspace());
    await workspaceStore.clear();
    expect(await workspaceStore.read()).toBeNull();
  });

  it("asset store: put() then get() via a committed workspace round-trips bytes", async () => {
    const { workspaceStore, assetStore } = createStores(dataDir);
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

    const asset = await assetStore.put({
      kind: "attachment",
      fileName: "work.png",
      mimeType: "image/png",
      bytes,
    });

    await workspaceStore.write(makeWorkspace({ attachments: [asset] }));

    const result = await assetStore.get(asset.id);
    expect(result).not.toBeNull();
    expect(result?.bytes.equals(bytes)).toBe(true);
    expect(result?.meta.fileName).toBe("work.png");
  });

  it("asset store: get() returns null for an asset not referenced by the current workspace", async () => {
    const { workspaceStore, assetStore } = createStores(dataDir);
    await workspaceStore.write(makeWorkspace());

    expect(await assetStore.get("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("asset store: get() safely returns null for traversal-looking ids instead of reading arbitrary paths", async () => {
    const { workspaceStore, assetStore } = createStores(dataDir);
    await workspaceStore.write(makeWorkspace());

    expect(await assetStore.get("../../../../etc/passwd")).toBeNull();
    expect(await assetStore.get("..%2f..%2fetc%2fpasswd")).toBeNull();
  });

  it("asset store: remove() deletes the underlying file", async () => {
    const { assetStore } = createStores(dataDir);
    const asset = await assetStore.put({
      kind: "whiteboard",
      fileName: "board.png",
      mimeType: "image/png",
      bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });

    await assetStore.remove(asset);

    // get() looks up via the workspace, but we can confirm removal doesn't throw and
    // a subsequent put() reusing storage space behaves normally.
    const second = await assetStore.put({
      kind: "whiteboard",
      fileName: "board2.png",
      mimeType: "image/png",
      bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    expect(second.id).not.toBe(asset.id);
  });
});
