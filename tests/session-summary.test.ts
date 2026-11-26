import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { modelSessionSummarySchema } from "@/schemas/session";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { SESSION_SUMMARY_PROMPT_VERSION } from "@/server/ai/prompts";
import { summarizeStoredSession } from "@/server/sessions/summary";
import { createStores } from "@/server/storage";
import type { TutorSession } from "@/contracts/sessions";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
import { AnthropicAnalysisProvider } from "@/server/ai/anthropic-provider";

const SAMPLE = path.join(process.cwd(), "samples/sessions/2026-10-03-linear-equations-review.txt");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const VALID = { title: "Linear equations review", summary: "Worked on brackets. Checks caught two errors.", observations: [{ category: "habit", text: "Skips checks." }] };

function makeSession(transcriptText: string, overrides: Partial<TutorSession> = {}): Omit<TutorSession, "whiteboards"> {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1, id: crypto.randomUUID(), sessionDate: "2026-10-03", uploadedAt: now, updatedAt: now,
    tutorNotes: "Quiz this week.", transcriptFileName: "session.txt", transcriptText,
    status: "pending", summaryStartedAt: null, title: null, summary: null, observations: [],
    model: null, promptVersion: null, summarizedAt: null, ...overrides,
  };
}

describe("modelSessionSummarySchema", () => {
  it("accepts a valid summary, with or without quotes", () => {
    expect(modelSessionSummarySchema.safeParse(VALID).success).toBe(true);
    expect(modelSessionSummarySchema.safeParse({ ...VALID, observations: [{ category: "struggle", text: "Bracket slip.", quote: "2x plus 3?" }] }).success).toBe(true);
  });

  it.each([
    { ...VALID, title: "x".repeat(81) },
    { ...VALID, title: "" },
    { ...VALID, observations: Array(9).fill(VALID.observations[0]) },
    { ...VALID, observations: [{ category: "learning_style", text: "Visual learner." }] },
  ])("rejects an invalid summary %#", (candidate) => {
    expect(modelSessionSummarySchema.safeParse(candidate).success).toBe(false);
  });
});

describe("MockAnalysisProvider.summarizeSession", () => {
  it("is deterministic, schema-valid and titled from the Session header", async () => {
    const input = { grade: 9, sessionDate: "2026-10-03", transcriptText: await readFile(SAMPLE, "utf8"), tutorNotes: "", whiteboards: [] };
    const first = await new MockAnalysisProvider().summarizeSession(input);
    expect(await new MockAnalysisProvider().summarizeSession(input)).toEqual(first);
    expect(modelSessionSummarySchema.parse(first).title).toBe("Linear equations review");
  });

  it("falls back to the session date without a header", async () => {
    const result = await new MockAnalysisProvider().summarizeSession({ grade: 9, sessionDate: "2026-10-03", transcriptText: "Tutor: hi", tutorNotes: "", whiteboards: [] });
    expect(result.title).toBe("Session on 2026-10-03");
  });
});

describe("summarizeStoredSession (mock AI, isolated temp directory)", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;

  beforeEach(async () => {
    process.env.AI_MOCK_MODE = "true";
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-session-summary-"));
    stores = createStores(dataDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dataDir, { recursive: true, force: true });
  });

  it("moves a session from pending to ready and sends its whiteboards to the provider", async () => {
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "summarizeSession");
    const { id } = await stores.sessionStore.create(makeSession(await readFile(SAMPLE, "utf8")), [{ fileName: "board.png", mimeType: "image/png", bytes: PNG }]);

    const session = await summarizeStoredSession(id, stores);

    expect(session).toMatchObject({ status: "ready", title: "Linear equations review", model: "mock-provider", promptVersion: SESSION_SUMMARY_PROMPT_VERSION });
    expect(session.observations.length).toBeGreaterThan(0);
    expect(session.summarizedAt).not.toBeNull();
    expect(await stores.sessionStore.read(id)).toEqual(session);
    expect(spy.mock.calls[0][0]).toMatchObject({ grade: 9, sessionDate: "2026-10-03", tutorNotes: "Quiz this week." });
    expect(spy.mock.calls[0][0].whiteboards[0].bytes.equals(PNG)).toBe(true);
  });

  it("marks the session failed when the provider throws, and a retry succeeds", async () => {
    vi.spyOn(MockAnalysisProvider.prototype, "summarizeSession").mockRejectedValueOnce(new Error("boom"));
    const { id } = await stores.sessionStore.create(makeSession("Session: Retry\nTutor: hi"), []);

    await expect(summarizeStoredSession(id, stores)).rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
    expect((await stores.sessionStore.read(id))?.status).toBe("failed");

    expect(await summarizeStoredSession(id, stores)).toMatchObject({ status: "ready", title: "Retry" });
  });

  it("marks the session failed when the provider output is invalid", async () => {
    vi.spyOn(MockAnalysisProvider.prototype, "summarizeSession").mockResolvedValueOnce({ ...VALID, title: "" } as never);
    const { id } = await stores.sessionStore.create(makeSession("Tutor: hi"), []);

    await expect(summarizeStoredSession(id, stores)).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
    expect((await stores.sessionStore.read(id))?.status).toBe("failed");
  });

  it("reclaims a stale pending claim", async () => {
    const stale = new Date(Date.now() - 3 * 60_000).toISOString();
    const { id } = await stores.sessionStore.create(makeSession("Tutor: hi", { summaryStartedAt: stale }), []);

    const session = await summarizeStoredSession(id, stores);

    expect(session.status).toBe("ready");
    expect(session.summaryStartedAt).not.toBe(stale);
  });

  it("does not call the provider while another claim is in progress", async () => {
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "summarizeSession");
    const startedAt = new Date().toISOString();
    const { id } = await stores.sessionStore.create(makeSession("Tutor: hi", { summaryStartedAt: startedAt }), []);

    const session = await summarizeStoredSession(id, stores);

    expect(spy).not.toHaveBeenCalled();
    expect(session).toMatchObject({ status: "pending", summaryStartedAt: startedAt });
  });
});

describe("AnthropicAnalysisProvider.summarizeSession (SDK mocked, no network)", () => {
  const input = { grade: 9, sessionDate: "2026-10-03", transcriptText: "Student: 2x plus 3?", tutorNotes: "", whiteboards: [{ fileName: "board.png", mimeType: "image/png" as const, bytes: PNG }] };

  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ model: "x", usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(VALID) }] });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses the cheap summary model, not ANTHROPIC_MODEL", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5-5");
    vi.stubEnv("ANTHROPIC_SUMMARY_MODEL", "");
    expect(await new AnthropicAnalysisProvider().summarizeSession(input)).toEqual(VALID);
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("claude-haiku-5-5");
    expect(request.max_tokens).toBe(2048);
    expect(request.messages[0].content[0].text).toContain("Session date: 2026-10-03.");
    expect(request.messages[0].content[1].type).toBe("image");

    vi.stubEnv("ANTHROPIC_SUMMARY_MODEL", "claude-haiku-4-5");
    await new AnthropicAnalysisProvider().summarizeSession(input);
    expect(create.mock.calls[1][0].model).toBe("claude-haiku-4-5");
  });

  it("truncates very long transcripts with a note instead of failing", async () => {
    await new AnthropicAnalysisProvider().summarizeSession({ ...input, transcriptText: "x".repeat(130_000) });
    const text: string = create.mock.calls[0][0].messages[0].content[0].text;
    expect(text).toContain("[Transcript truncated after 120000 characters.]");
    expect(text.length).toBeLessThan(121_000);
  });
});
