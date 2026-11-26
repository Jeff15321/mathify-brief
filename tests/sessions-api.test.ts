import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { createSession, deleteSession, getSession, getSessionAsset, listSessions, retrySessionSummary, updateSession } from "@/server/sessions/service";
import { createStores } from "@/server/storage";
import { localToday } from "@/schemas/session";

const SAMPLE = path.join(process.cwd(), "samples/sessions/2026-10-17-area-models.txt");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const PDF = Buffer.from("%PDF-1.4\n");
const board = (n = 1) => Array.from({ length: n }, (_, i) => ({ fileName: `board-${i}.png`, mimeType: "image/png", bytes: PNG }));

describe("session service (mock AI, isolated temp directory)", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;
  let transcript: { fileName: string; mimeType: string; bytes: Buffer };

  beforeEach(async () => {
    process.env.AI_MOCK_MODE = "true";
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-sessions-api-"));
    stores = createStores(dataDir);
    transcript = { fileName: "area-models.txt", mimeType: "text/plain", bytes: await readFile(SAMPLE) };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dataDir, { recursive: true, force: true });
  });

  it("saves an upload and summarizes it to ready", async () => {
    const session = await createSession({ transcript, whiteboards: board(), sessionDate: "2026-10-17", tutorNotes: "  Quiz Friday.  " }, stores);

    expect(session).toMatchObject({ status: "ready", sessionDate: "2026-10-17", tutorNotes: "Quiz Friday.", transcriptFileName: "area-models.txt" });
    expect(session.title).not.toBeNull();
    expect(session.whiteboards).toHaveLength(1);
    expect(await getSession(session.id, stores)).toEqual(session);
    const asset = await getSessionAsset(session.id, session.whiteboards[0].id, stores);
    expect(asset.meta.mimeType).toBe("image/png");
    expect(asset.bytes.equals(PNG)).toBe(true);
  });

  it("defaults sessionDate to today and tutorNotes to empty", async () => {
    expect(await createSession({ transcript, whiteboards: [] }, stores)).toMatchObject({ sessionDate: localToday(), tutorNotes: "" });
  });

  it("keeps the upload as failed when the summary fails, then retries to ready and rejects a second retry", async () => {
    vi.spyOn(MockAnalysisProvider.prototype, "summarizeSession").mockRejectedValueOnce(new Error("boom"));
    const failed = await createSession({ transcript, whiteboards: [] }, stores);
    expect(failed.status).toBe("failed");
    expect(failed.transcriptText).toContain("Area models");

    expect((await retrySessionSummary(failed.id, stores)).status).toBe("ready");
    await expect(retrySessionSummary(failed.id, stores)).rejects.toMatchObject({ status: 409, code: "INVALID_STATE" });
  });

  it.each([
    ["an unsupported transcript extension", { transcript: { fileName: "session.pdf", mimeType: "application/pdf", bytes: PDF } }],
    ["a missing transcript", { transcript: null }],
    ["an empty transcript", { transcript: { fileName: "empty.txt", mimeType: "text/plain", bytes: Buffer.from("  \n ") } }],
    ["a non-UTF-8 transcript", { transcript: { fileName: "bad.txt", mimeType: "text/plain", bytes: Buffer.from([0xff, 0xfe, 0xfd]) } }],
    ["a PDF whiteboard", { whiteboards: [{ fileName: "board.pdf", mimeType: "application/pdf", bytes: PDF }] }],
    ["a mislabelled whiteboard", { whiteboards: [{ fileName: "board.png", mimeType: "image/png", bytes: PDF }] }],
    ["more than 5 whiteboards", { whiteboards: board(6) }],
    ["a future date", { sessionDate: "2999-01-01" }],
    ["an invalid date", { sessionDate: "2026-02-30" }],
    ["tutor notes over 2000 characters", { tutorNotes: "x".repeat(2001) }],
  ])("rejects %s and saves nothing", async (_label, override) => {
    await expect(createSession({ transcript, whiteboards: [], ...override }, stores)).rejects.toMatchObject({ status: 400, code: "INVALID_INPUT" });
    expect(await listSessions(stores)).toEqual([]);
  });

  it("lists summaries without transcripts", async () => {
    const session = await createSession({ transcript, whiteboards: board(2), sessionDate: "2026-10-17" }, stores);

    const [summary] = await listSessions(stores);

    expect(summary).toEqual({
      id: session.id, title: session.title, summary: session.summary, sessionDate: "2026-10-17", status: "ready",
      whiteboardCount: 2, observationCount: session.observations.length,
    });
    expect(summary).not.toHaveProperty("transcriptText");
  });

  it("updates sessionDate and tutorNotes, and rejects invalid changes", async () => {
    const { id } = await createSession({ transcript, whiteboards: [], sessionDate: "2026-10-17" }, stores);

    expect(await updateSession(id, { sessionDate: "2026-10-16", tutorNotes: "Moved." }, stores)).toMatchObject({ sessionDate: "2026-10-16", tutorNotes: "Moved." });
    expect(await updateSession(id, { tutorNotes: "" }, stores)).toMatchObject({ sessionDate: "2026-10-16", tutorNotes: "" });
    await expect(updateSession(id, { sessionDate: "2999-01-01" }, stores)).rejects.toMatchObject({ status: 400 });
    await expect(updateSession(id, { tutorNotes: 5 }, stores)).rejects.toMatchObject({ status: 400 });
    await expect(updateSession(crypto.randomUUID(), {}, stores)).rejects.toMatchObject({ status: 404 });
  });

  it("deletes the session JSON and its whiteboard files", async () => {
    const { id } = await createSession({ transcript, whiteboards: board(), sessionDate: "2026-10-17" }, stores);

    await deleteSession(id, stores);

    expect(await readdir(path.join(dataDir, "sessions"))).toEqual([]);
    await expect(getSession(id, stores)).rejects.toMatchObject({ status: 404 });
    await expect(deleteSession(id, stores)).rejects.toMatchObject({ status: 404 });
  });

  it("returns 404 for a whiteboard requested through another session", async () => {
    const first = await createSession({ transcript, whiteboards: board(), sessionDate: "2026-10-17" }, stores);
    const second = await createSession({ transcript, whiteboards: [], sessionDate: "2026-10-17" }, stores);

    await expect(getSessionAsset(second.id, first.whiteboards[0].id, stores)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(getSessionAsset(first.id, crypto.randomUUID(), stores)).rejects.toMatchObject({ status: 404 });
  });
});
