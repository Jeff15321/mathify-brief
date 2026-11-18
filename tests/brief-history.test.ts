import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBriefHistory, submitBrief } from "@/server/brief-service";
import { updateProfile } from "@/server/learner-profile-service";
import { startWorkspace, getPublicWorkspace } from "@/server/workspace-service";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { HISTORY_PROMPT_VERSION } from "@/server/ai/prompts";
import { setupWorkspace, type Stores } from "./helpers";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
import { AnthropicAnalysisProvider } from "@/server/ai/anthropic-provider";

describe("Relevant history on the brief (mock AI, isolated temp storage)", () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;
  let workspaceId: string;
  const addItem = () => updateProfile({ upsertItems: [{ category: "struggle", text: "Multiplies only the first term.", status: "active" }] }, stores);

  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace("brief-history"));
    await submitBrief({ whiteboardPng: null }, stores);
    workspaceId = (await stores.workspaceStore.read())!.workspaceId;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  it("stores empty bullets without calling the AI when the profile has no items", async () => {
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "relevantHistory");

    const history = await getBriefHistory(workspaceId, stores);

    expect(history).toMatchObject({ status: "ready", bullets: [], promptVersion: HISTORY_PROMPT_VERSION });
    expect(spy).not.toHaveBeenCalled();
    expect((await stores.workspaceStore.read())!.brief!.history).toEqual(history);
  });

  it("sends the brief and profile to the AI once, then reuses the stored result", async () => {
    await addItem();
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "relevantHistory");

    const first = await getBriefHistory(workspaceId, stores);
    const second = await getBriefHistory(workspaceId, stores);

    expect(first).toMatchObject({ status: "ready", bullets: ["Multiplies only the first term."], model: "mock-provider", promptVersion: HISTORY_PROMPT_VERSION });
    expect(second).toEqual(first);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ grade: 9, topic: "Linear equations", profile: { items: [{ category: "struggle", text: "Multiplies only the first term.", status: "active", evidence: [] }] } });
  });

  it("stores a failure and does not retry it", async () => {
    await addItem();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "relevantHistory").mockRejectedValue(new Error("boom"));

    expect(await getBriefHistory(workspaceId, stores)).toEqual({ status: "failed" });
    expect(await getBriefHistory(workspaceId, stores)).toEqual({ status: "failed" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not save onto a report replaced during the AI call", async () => {
    await addItem();
    vi.spyOn(MockAnalysisProvider.prototype, "relevantHistory").mockImplementation(async () => {
      await startWorkspace({ questionText: "Another question", files: [] }, stores);
      return { bullets: ["Stale"] };
    });

    await expect(getBriefHistory(workspaceId, stores)).rejects.toMatchObject({ status: 409 });
    expect((await stores.workspaceStore.read())!.brief).toBeNull();
  });

  it("rejects another workspace id and keeps the feedback report id stable", async () => {
    const reportId = (await getPublicWorkspace(stores))!.feedbackReportId;
    await expect(getBriefHistory(crypto.randomUUID(), stores)).rejects.toMatchObject({ status: 409 });

    await getBriefHistory(workspaceId, stores);

    expect((await getPublicWorkspace(stores))!.feedbackReportId).toBe(reportId);
  });
});

describe("AnthropicAnalysisProvider.relevantHistory", () => {
  it("uses the summary model and the history prompt", async () => {
    create.mockResolvedValue({ model: "claude-haiku-5-5", stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: '{"bullets":["Seen Oct 3."]}' }] });

    const output = await new AnthropicAnalysisProvider().relevantHistory({
      grade: 9, parsedQuestionMarkdown: "Solve $2(x+3)=14$.", topic: "Linear equations", results: [], notReachedConcepts: [],
      profile: { items: [{ category: "struggle", text: "Sign errors.", status: "active", evidence: [{ sessionId: "a", date: "2026-10-03" }] }], nextFocus: "", tutorNotes: "" },
    });

    expect(output).toEqual({ bullets: ["Seen Oct 3."] });
    expect(create.mock.calls[0][0]).toMatchObject({ model: process.env.ANTHROPIC_SUMMARY_MODEL || "claude-haiku-5-5" });
    expect(create.mock.calls[0][0].system).toContain("learner profile");
    expect(create.mock.calls[0][0].messages[0].content[0].text).toContain("2026-10-03");
  });
});
