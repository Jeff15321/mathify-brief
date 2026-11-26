import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStores } from "@/server/storage";
import type { TutorSession } from "@/contracts/sessions";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function makeSession(overrides: Partial<TutorSession> = {}): Omit<TutorSession, "whiteboards"> {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    sessionDate: "2026-10-03",
    uploadedAt: now,
    updatedAt: now,
    tutorNotes: "",
    transcriptFileName: "session.txt",
    transcriptText: "[00:00:05] Tutor: Let's start with 2(x + 3) = 14.",
    status: "pending",
    summaryStartedAt: null,
    title: null,
    summary: null,
    observations: [],
    model: null,
    promptVersion: null,
    summarizedAt: null,
    ...overrides,
  };
}

const exists = (target: string) => access(target).then(() => true, () => false);

describe("LocalSessionStore (isolated temp directory)", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-sessions-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("create() then read() round-trips the session and its whiteboard bytes", async () => {
    const { sessionStore } = createStores(dataDir);
    const created = await sessionStore.create(makeSession(), [{ fileName: "board.png", mimeType: "image/png", bytes: PNG }]);

    expect(await sessionStore.read(created.id)).toEqual(created);
    expect(created.whiteboards).toMatchObject([{ kind: "whiteboard", fileName: "board.png", sizeBytes: PNG.byteLength }]);
    const asset = await sessionStore.readAsset(created.id, created.whiteboards[0].id);
    expect(asset?.bytes.equals(PNG)).toBe(true);
  });

  it("list() returns [] without a sessions folder and sorts by sessionDate, then uploadedAt, descending", async () => {
    const { sessionStore } = createStores(dataDir);
    expect(await sessionStore.list()).toEqual([]);

    await sessionStore.create(makeSession({ sessionDate: "2026-09-26", title: "oldest" }), []);
    await sessionStore.create(makeSession({ sessionDate: "2026-11-07", uploadedAt: "2026-11-08T10:00:00.000Z", title: "late upload" }), []);
    await sessionStore.create(makeSession({ sessionDate: "2026-11-07", uploadedAt: "2026-11-07T10:00:00.000Z", title: "early upload" }), []);
    await sessionStore.create(makeSession({ sessionDate: "2026-10-17", title: "middle" }), []);

    expect((await sessionStore.list()).map((session) => session.title)).toEqual(["late upload", "early upload", "middle", "oldest"]);
  });

  it("update() serializes concurrent read-modify-write calls so both updates are applied", async () => {
    const { sessionStore } = createStores(dataDir);
    const { id } = await sessionStore.create(makeSession(), []);

    await Promise.all(
      ["a", "b"].map((letter) =>
        sessionStore.update(id, async (current) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { ...current, tutorNotes: current.tutorNotes + letter };
        }),
      ),
    );

    expect((await sessionStore.read(id))?.tutorNotes).toBe("ab");
  });

  it("update() rejects a missing session", async () => {
    const { sessionStore } = createStores(dataDir);
    await expect(sessionStore.update(crypto.randomUUID(), (current) => current)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("remove() deletes the session JSON and its whiteboard folder", async () => {
    const { sessionStore } = createStores(dataDir);
    const { id } = await sessionStore.create(makeSession(), [{ fileName: "board.png", mimeType: "image/png", bytes: PNG }]);
    expect(await exists(path.join(dataDir, "sessions", id))).toBe(true);

    await sessionStore.remove(id);

    expect(await sessionStore.read(id)).toBeNull();
    expect(await exists(path.join(dataDir, "sessions", `${id}.json`))).toBe(false);
    expect(await exists(path.join(dataDir, "sessions", id))).toBe(false);
  });

  it("rejects invalid ids before building any path", async () => {
    const { sessionStore } = createStores(dataDir);
    for (const id of ["../../../../etc/passwd", "..%2f..%2fetc%2fpasswd", "not-a-uuid"]) {
      await expect(sessionStore.read(id)).rejects.toMatchObject({ code: "INVALID_INPUT" });
      await expect(sessionStore.remove(id)).rejects.toMatchObject({ code: "INVALID_INPUT" });
      await expect(sessionStore.readAsset(id, crypto.randomUUID())).rejects.toMatchObject({ code: "INVALID_INPUT" });
    }
  });

  it("readAsset() only serves whiteboards that belong to the requested session", async () => {
    const { sessionStore } = createStores(dataDir);
    const first = await sessionStore.create(makeSession(), [{ fileName: "a.png", mimeType: "image/png", bytes: PNG }]);
    const second = await sessionStore.create(makeSession(), []);

    expect(await sessionStore.readAsset(second.id, first.whiteboards[0].id)).toBeNull();
    expect(await sessionStore.readAsset(first.id, crypto.randomUUID())).toBeNull();
    expect(await sessionStore.readAsset(first.id, first.whiteboards[0].id)).not.toBeNull();
  });
});
