import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { PROFILE_PROMPT_VERSION } from "@/server/ai/prompts";
import { getProfile, rebuildProfile, updateProfile } from "@/server/profile/service";
import { createSession, deleteSession, updateSession } from "@/server/sessions/service";
import { createStores } from "@/server/storage";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
import { AnthropicAnalysisProvider } from "@/server/ai/anthropic-provider";

const SAMPLES = path.join(process.cwd(), "samples/sessions");
const transcriptFile = async (name: string) => ({ fileName: name, mimeType: "text/plain", bytes: await readFile(path.join(SAMPLES, name)) });

describe("learner profile (mock AI, isolated temp directory)", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;
  const upload = async (name: string, sessionDate: string) => createSession({ transcript: await transcriptFile(name), whiteboards: [], sessionDate }, stores);
  const uploadTwo = async () => [
    await upload("2026-09-26-multi-step-equations.txt", "2026-09-26"),
    await upload("2026-10-03-linear-equations-review.txt", "2026-10-03"),
  ];

  beforeEach(async () => {
    process.env.AI_MOCK_MODE = "true";
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-learner-profile-"));
    stores = createStores(dataDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dataDir, { recursive: true, force: true });
  });

  it("returns an empty profile without writing a file", async () => {
    expect(await getProfile(stores)).toMatchObject({
      schemaVersion: 1, nextFocus: "", nextFocusSource: "ai", items: [], tutorNotes: "", rebuiltAt: null, rebuildStatus: "idle", model: null, promptVersion: null,
    });
    expect(await readdir(dataDir)).toEqual([]);
  });

  it("rebuilds after each summarized upload, grouping observations with dated evidence", async () => {
    const [first, second] = await uploadTwo();

    const profile = await getProfile(stores);

    expect(profile).toMatchObject({ rebuildStatus: "idle", model: "mock-provider", promptVersion: PROFILE_PROMPT_VERSION });
    expect(profile.rebuiltAt).not.toBeNull();
    expect(profile.nextFocus).toContain("Multiplied only the first term");
    expect(first.observations).toHaveLength(2);
    expect(second.observations).toHaveLength(2);
    const evidenceFor = (text: string) => profile.items.find((item) => item.text === text)?.evidence.map(({ sessionId, date }) => ({ sessionId, date }));
    expect(evidenceFor("Multiplied only the first term inside brackets.")).toEqual([
      { sessionId: first.id, date: "2026-09-26" },
      { sessionId: second.id, date: "2026-10-03" },
    ]);
    expect(evidenceFor("Solved one-step equations quickly and correctly.")).toEqual([{ sessionId: first.id, date: "2026-09-26" }]);
    expect(evidenceFor("Kept the sign when moving a term across the equals sign.")).toEqual([{ sessionId: second.id, date: "2026-10-03" }]);
    expect(profile.items.every((item) => item.source === "ai" && item.evidence.length <= 2)).toBe(true);
    expect(JSON.parse(await readFile(path.join(dataDir, "learner-profile.json"), "utf8"))).toEqual(profile);
  });

  it("keeps tutor items and notes through a rebuild and sends them as read-only context", async () => {
    await uploadTwo();
    const { items } = await updateProfile({ tutorNotes: "  Quiz Friday. ", upsertItems: [{ category: "what_works", text: "Number lines help.", status: "active" }] }, stores);
    const tutorItem = items.find((item) => item.source === "tutor")!;
    expect(tutorItem).toMatchObject({ text: "Number lines help.", evidence: [] });
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "buildLearnerProfile");

    const rebuilt = await rebuildProfile(stores);

    expect(rebuilt.tutorNotes).toBe("Quiz Friday.");
    expect(rebuilt.items).toContainEqual(tutorItem);
    expect(spy.mock.calls[0][0]).toMatchObject({ tutorNotes: "Quiz Friday." });
    expect(spy.mock.calls[0][0].currentItems).toContainEqual({ source: "tutor", category: "what_works", text: "Number lines help.", status: "active" });
  });

  it("keeps a tutor next focus through rebuilds until the tutor hands it back with an empty value", async () => {
    await uploadTwo();
    const aiFocus = (await getProfile(stores)).nextFocus;
    expect(await updateProfile({ nextFocus: " Fractions first. " }, stores)).toMatchObject({ nextFocus: "Fractions first.", nextFocusSource: "tutor" });
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "buildLearnerProfile");

    expect(await rebuildProfile(stores)).toMatchObject({ nextFocus: "Fractions first.", nextFocusSource: "tutor" });
    expect(spy.mock.calls[0][0].tutorNextFocus).toBe("Fractions first.");

    expect(await updateProfile({ nextFocus: "" }, stores)).toMatchObject({ nextFocus: "", nextFocusSource: "ai" });
    expect(await rebuildProfile(stores)).toMatchObject({ nextFocus: aiFocus, nextFocusSource: "ai" });
    expect(spy.mock.calls[1][0].tutorNextFocus).toBe("");
  });

  it("converts an edited AI item to a tutor item that keeps its evidence, and deletes items", async () => {
    await uploadTwo();
    const [aiItem, toDelete] = (await getProfile(stores)).items;

    const profile = await updateProfile({ upsertItems: [{ ...aiItem, text: "Edited.", status: "improving" }], deleteItemIds: [toDelete.id] }, stores);

    const edited = { ...aiItem, text: "Edited.", status: "improving", source: "tutor", originText: aiItem.text };
    expect(profile.items.find((item) => item.id === aiItem.id)).toEqual(edited);
    expect(profile.items.some((item) => item.id === toDelete.id)).toBe(false);
    expect((await updateProfile({ upsertItems: [{ ...edited, text: "Edited twice." }] }, stores)).items).toContainEqual({ ...edited, text: "Edited twice." });

    const rebuilt = await rebuildProfile(stores);
    expect(rebuilt.items).toContainEqual({ ...edited, text: "Edited twice." });
    expect(rebuilt.items.filter((item) => item.text === aiItem.text)).toEqual([]);
  });

  it("drops rebuilt AI items matching a tutor item's normalized text in the same category only", async () => {
    await uploadTwo();
    const [struggle] = (await getProfile(stores)).items;
    await updateProfile({ upsertItems: [
      { category: "struggle", text: `  ${struggle.text.toUpperCase().replace(/ /g, "   ")} `, status: "active" },
      { category: "habit", text: "Solved one-step equations quickly and correctly.", status: "active" },
    ] }, stores);

    const { items } = await rebuildProfile(stores);

    expect(items.filter((item) => item.source === "ai" && item.text === struggle.text)).toEqual([]);
    expect(items.some((item) => item.source === "ai" && item.text === "Solved one-step equations quickly and correctly.")).toBe(true);
  });

  it("keeps a deleted AI item out of later rebuilds and sends it as context, but deleting a tutor item dismisses nothing", async () => {
    await uploadTwo();
    const [aiItem] = (await getProfile(stores)).items;
    const tutorItem = (await updateProfile({ upsertItems: [{ category: "habit", text: "Rushes.", status: "active" }] }, stores)).items.find((item) => item.source === "tutor")!;
    expect((await updateProfile({ deleteItemIds: [tutorItem.id] }, stores)).dismissed).toEqual([]);
    const dismissed = [{ category: aiItem.category, text: aiItem.text }];
    expect((await updateProfile({ deleteItemIds: [aiItem.id] }, stores)).dismissed).toEqual(dismissed);
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "buildLearnerProfile");

    const rebuilt = await rebuildProfile(stores);
    await upload("2026-10-17-area-models.txt", "2026-10-17");

    expect(rebuilt.items.length).toBeGreaterThan(0);
    expect(rebuilt.items.some((item) => item.text === aiItem.text)).toBe(false);
    expect((await getProfile(stores)).items.some((item) => item.text === aiItem.text)).toBe(false);
    expect(spy.mock.calls[0][0].dismissedItems).toEqual(dismissed);
  });

  it("keeps the original AI wording out after an edited AI item is deleted", async () => {
    await uploadTwo();
    const [aiItem] = (await getProfile(stores)).items;
    await updateProfile({ upsertItems: [{ id: aiItem.id, category: aiItem.category, text: "Edited wording.", status: "active" }] }, stores);

    const { dismissed } = await updateProfile({ deleteItemIds: [aiItem.id] }, stores);
    const rebuilt = await rebuildProfile(stores);

    expect(dismissed).toEqual([{ category: aiItem.category, text: aiItem.text }]);
    expect(rebuilt.items.some((item) => item.text === aiItem.text)).toBe(false);
  });

  it("tolerates a saved profile without dismissed and keeps the latest 100 dismissed items", async () => {
    await uploadTwo();
    const file = path.join(dataDir, "learner-profile.json");
    const saved = JSON.parse(await readFile(file, "utf8"));
    delete saved.dismissed;
    await writeFile(file, JSON.stringify(saved));
    const profile = await getProfile(stores);
    expect(profile.dismissed).toEqual([]);
    await writeFile(file, JSON.stringify({ ...saved, dismissed: Array.from({ length: 100 }, (_, i) => ({ category: "habit", text: `Old ${i}` })) }));

    const { dismissed } = await updateProfile({ deleteItemIds: [profile.items[0].id] }, stores);

    expect(dismissed).toHaveLength(100);
    expect(dismissed[0].text).toBe("Old 1");
    expect(dismissed[99]).toEqual({ category: profile.items[0].category, text: profile.items[0].text });
  });

  it("drops evidence for a deleted session and AI items left without evidence", async () => {
    const first = await upload("2026-09-26-multi-step-equations.txt", "2026-09-26");
    vi.spyOn(MockAnalysisProvider.prototype, "summarizeSession").mockResolvedValueOnce({
      title: "Review", summary: "Short.", observations: [{ category: "strength", text: "Checks answers now." }],
    });
    const second = await upload("2026-10-03-linear-equations-review.txt", "2026-10-03");
    const shared = (await getProfile(stores)).items.find((item) => item.text === first.observations[0].text)!;
    await updateProfile({ upsertItems: [{ ...shared, text: "Tutor copy." }] }, stores);
    expect((await getProfile(stores)).items.some((item) => item.text === "Checks answers now.")).toBe(true);

    await deleteSession(second.id, stores);

    const profile = await getProfile(stores);
    expect(profile.items.some((item) => item.text === "Checks answers now.")).toBe(false);
    expect(profile.items.length).toBeGreaterThan(0);
    expect(profile.items.flatMap((item) => item.evidence).every((evidence) => evidence.sessionId === first.id)).toBe(true);
    expect(profile.items.find((item) => item.id === shared.id)).toMatchObject({ source: "tutor", text: "Tutor copy." });
  });

  it("refreshes evidence dates after a session date edit", async () => {
    const [first] = await uploadTwo();

    await updateSession(first.id, { sessionDate: "2026-09-25" }, stores);

    expect((await getProfile(stores)).items[0].evidence[0]).toMatchObject({ sessionId: first.id, date: "2026-09-25" });
  });

  it("keeps the previous profile as failed when a rebuild fails, without failing the session operation", async () => {
    const [first] = await uploadTwo();
    const previous = await getProfile(stores);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "buildLearnerProfile").mockRejectedValueOnce(new Error("boom"));

    await expect(rebuildProfile(stores)).rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
    expect(await getProfile(stores)).toEqual({ ...previous, rebuildStatus: "failed" });

    spy.mockResolvedValueOnce({ nextFocus: "x", items: [{ category: "habit", text: "", status: "active", evidence: [] }] });
    expect(await updateSession(first.id, { tutorNotes: "Edited." }, stores)).toMatchObject({ tutorNotes: "Edited." });
    expect(await getProfile(stores)).toEqual({ ...previous, rebuildStatus: "failed" });
    expect(console.error).toHaveBeenCalledWith("Learner profile rebuild failed:", expect.anything());

    expect((await rebuildProfile(stores)).rebuildStatus).toBe("idle");
  });

  it("serializes concurrent rebuilds", async () => {
    await uploadTwo();
    let active = 0;
    let maxActive = 0;
    const original = MockAnalysisProvider.prototype.buildLearnerProfile;
    vi.spyOn(MockAnalysisProvider.prototype, "buildLearnerProfile").mockImplementation(async function (this: MockAnalysisProvider, input) {
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return original.call(this, input);
    });

    const results = await Promise.all([rebuildProfile(stores), rebuildProfile(stores), rebuildProfile(stores)]);

    expect(maxActive).toBe(1);
    expect(results.every((profile) => profile.rebuildStatus === "idle")).toBe(true);
    expect((await getProfile(stores)).items).toHaveLength(results[2].items.length);
  });

  it("clears AI items without calling the model when no sessions are ready", async () => {
    await updateProfile({ upsertItems: [{ category: "habit", text: "Rushes.", status: "active" }] }, stores);
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "buildLearnerProfile");

    const profile = await rebuildProfile(stores);

    expect(spy).not.toHaveBeenCalled();
    expect(profile).toMatchObject({ nextFocus: "", rebuildStatus: "idle" });
    expect(profile.items.map((item) => item.text)).toEqual(["Rushes."]);
  });

  it.each([
    ["an over-long item", { upsertItems: [{ category: "habit", text: "x".repeat(301), status: "active" }] }],
    ["an empty item", { upsertItems: [{ category: "habit", text: "  ", status: "active" }] }],
    ["an unknown category", { upsertItems: [{ category: "learning_style", text: "Visual.", status: "active" }] }],
    ["an invalid item id", { deleteItemIds: ["nope"] }],
    ["over-long tutor notes", { tutorNotes: "x".repeat(2001) }],
    ["an over-long next focus", { nextFocus: "x".repeat(301) }],
  ])("rejects %s", async (_label, input) => {
    await expect(updateProfile(input, stores)).rejects.toMatchObject({ status: 400, code: "INVALID_INPUT" });
  });
});

describe("AnthropicAnalysisProvider.buildLearnerProfile (SDK mocked, no network)", () => {
  const output = { nextFocus: "Brackets.", items: [{ category: "struggle", text: "Brackets.", status: "active", evidence: [{ sessionId: "s1" }] }] };

  afterEach(() => vi.unstubAllEnvs());

  it("uses the cheap summary model and sends the sessions", async () => {
    create.mockResolvedValue({ model: "x", usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(output) }] });
    vi.stubEnv("ANTHROPIC_SUMMARY_MODEL", "");
    const input = { grade: 9, currentItems: [], tutorNotes: "", tutorNextFocus: "", dismissedItems: [], sessions: [{ sessionId: "s1", date: "2026-10-03", title: "T", observations: [] }] };

    expect(await new AnthropicAnalysisProvider().buildLearnerProfile(input)).toEqual(output);
    expect(create.mock.calls[0][0].model).toBe("claude-haiku-5-5");
    expect(create.mock.calls[0][0].messages[0].content[0].text).toContain('"sessionId":"s1"');
  });
});
