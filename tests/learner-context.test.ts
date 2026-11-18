import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeCurrentWorkspace } from "@/server/analysis-service";
import { generateNextProbePair } from "@/server/probe-service";
import { getPublicWorkspace } from "@/server/workspace-service";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { buildLearnerContext } from "@/server/helpers/learner-context-helper";
import { emptyLearnerProfile } from "@/server/storage/local-profile-store";
import { currentWorkspaceSchema } from "@/schemas/workspace";
import type { LearnerProfileItem } from "@/types/domain";
import { setupWorkspace, type Stores } from "./helpers";

const item = (overrides: Partial<LearnerProfileItem>): LearnerProfileItem => ({
  id: "item", category: "struggle", text: "Multiplies only the first term inside brackets.", status: "active", source: "ai", evidence: [], ...overrides,
});
const profileWith = (items: LearnerProfileItem[]) => ({ ...emptyLearnerProfile(), items });

describe("buildLearnerContext", () => {
  it("is undefined when no active or improving struggle or what-works item exists", () => {
    expect(buildLearnerContext(emptyLearnerProfile())).toBeUndefined();
    expect(buildLearnerContext(profileWith([
      item({ category: "strength" }), item({ category: "habit" }), item({ status: "resolved" }),
    ]))).toBeUndefined();
  });

  it("lists struggles first, then what works, each with its latest evidence date", () => {
    const context = buildLearnerContext(profileWith([
      item({ category: "what_works", text: "Asking what to try first.", status: "active", source: "tutor" }),
      item({ status: "improving", evidence: [
        { sessionId: "b", date: "2026-10-17" }, { sessionId: "a", date: "2026-10-03" },
      ] }),
    ]));
    expect(context).toBe([
      "- Struggle (improving, last seen 2026-10-17): Multiplies only the first term inside brackets.",
      "- What works (active): Asking what to try first.",
    ].join("\n"));
  });

  it("is capped at 1500 characters on a whole line", () => {
    const context = buildLearnerContext(profileWith(Array.from({ length: 40 }, (_, index) => item({ text: `${index} ${"x".repeat(80)}` }))))!;
    expect(context.length).toBeLessThanOrEqual(1500);
    expect(context.split("\n").every((line) => line.endsWith("x".repeat(80)))).toBe(true);
  });
});

describe("profile-aware probing (mocked AI provider, isolated temp storage)", () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace("learner-context", { analyze: false }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  it("passes the context to generation and review when the profile has struggles, never to the student", async () => {
    const profile = await stores.profileStore.update(() => profileWith([item({ evidence: [{ sessionId: "a", date: "2026-10-03" }] })]));
    const context = buildLearnerContext(profile);
    const analyze = vi.spyOn(MockAnalysisProvider.prototype, "analyzeQuestion");
    const reviewAnalysis = vi.spyOn(MockAnalysisProvider.prototype, "reviewAnalysis");
    const generate = vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair");
    const reviewPair = vi.spyOn(MockAnalysisProvider.prototype, "reviewProbePair");

    await analyzeCurrentWorkspace(stores);
    await generateNextProbePair(stores);

    expect(analyze.mock.calls[0][0].learnerContext).toBe(context);
    expect(reviewAnalysis.mock.calls[0][0].learnerContext).toBe(context);
    expect(generate.mock.calls[0][0].learnerContext).toBe(context);
    expect(reviewPair.mock.calls[0][0].learnerContext).toBe(context);
    const workspace = (await stores.workspaceStore.read())!;
    expect(workspace.analysis?.profileUpdatedAt).toBe(profile.updatedAt);
    expect(workspace.probeSteps.map((step) => step.status)).toEqual(["ready", "ready", "pending"]);

    const serialized = JSON.stringify(await getPublicWorkspace(stores));
    expect(serialized).not.toContain("Multiplies only the first term");
    expect(serialized).not.toContain("learnerContext");
    expect(serialized).not.toContain("profileUpdatedAt");
  });

  it("omits the context and provenance for an empty profile", async () => {
    const analyze = vi.spyOn(MockAnalysisProvider.prototype, "analyzeQuestion");
    const generate = vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair");
    await analyzeCurrentWorkspace(stores);
    await generateNextProbePair(stores);

    expect(analyze.mock.calls[0][0]).not.toHaveProperty("learnerContext");
    expect(generate.mock.calls[0][0]).not.toHaveProperty("learnerContext");
    expect((await stores.workspaceStore.read())!.analysis).not.toHaveProperty("profileUpdatedAt");
  });

  it("still loads workspaces saved with the previous prompt versions", async () => {
    await analyzeCurrentWorkspace(stores);
    const workspace = (await stores.workspaceStore.read())!;
    const older = {
      ...workspace,
      analysis: { ...workspace.analysis!, promptVersion: "analysis-v3" },
      probeSteps: workspace.probeSteps.map((step) => ({ ...step, promptVersion: step.promptVersion && "analysis-v3" })),
    };
    expect(currentWorkspaceSchema.safeParse(older).success).toBe(true);
  });
});
