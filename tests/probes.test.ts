import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerCurrentProbe, generateNextProbePair } from "@/server/probe-service";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { ApiError } from "@/server/errors";
import { setupWorkspace, type Stores } from "./helpers";

describe("Probe generation and answering (mocked AI provider, isolated temp storage)", () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace("probes"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  const statuses = async () => (await stores.workspaceStore.read())!.probeSteps.map((s) => s.status);

  it("generate fills the next step only, and is a no-op once the buffer is full", async () => {
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair");

    const view = await generateNextProbePair(stores);
    expect(await statuses()).toEqual(["ready", "ready", "pending"]);
    expect(view.needsPrefetch).toBe(false);

    await generateNextProbePair(stores);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("generateProbePair receives only the plan, parsed question and step index (no student answers)", async () => {
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair");
    await answerCurrentProbe({ probeId: "s1-main", answer: "A" }, stores);
    await generateNextProbePair(stores);

    const input = spy.mock.calls[0][0];
    expect(Object.keys(input).sort()).toEqual(["grade", "parsedQuestionMarkdown", "plan", "stepIndex"]);
    expect(input.stepIndex).toBe(1);
  });

  it("a wrong main answer serves the buffered easier question without any AI call", async () => {
    const spy = vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair");
    const view = await answerCurrentProbe({ probeId: "s1-main", answer: "IDK" }, stores);

    expect(view.current?.id).toBe("s1-easier");
    expect(view.progress).toEqual({ stepNumber: 1, totalSteps: 3, isEasier: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it("only the current probe can be answered: earlier, buffered and forged ids are rejected", async () => {
    await generateNextProbePair(stores);
    await expect(answerCurrentProbe({ probeId: "s2-main", answer: "A" }, stores)).rejects.toThrow(ApiError);
    await expect(answerCurrentProbe({ probeId: "nope", answer: "A" }, stores)).rejects.toThrow(ApiError);

    await answerCurrentProbe({ probeId: "s1-main", answer: "B" }, stores);
    await expect(answerCurrentProbe({ probeId: "s1-main", answer: "A" }, stores)).rejects.toThrow(ApiError);
    expect((await stores.workspaceStore.read())!.probeSteps[0].mainAnswer).toBe("B");
  });

  it("reaching a step that is not generated yet reports a waiting state, then the step appears", async () => {
    await answerCurrentProbe({ probeId: "s1-main", answer: "B" }, stores);
    const waiting = (await stores.workspaceStore.read())!;
    expect(waiting.cursor).toEqual({ stepIndex: 1, kind: "main" });

    const view = await generateNextProbePair(stores);
    expect(view.current?.id).toBe("s2-main");
  });

  it("an answer submitted while a pair is generating is not lost", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = MockAnalysisProvider.prototype.generateProbePair;
    vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair").mockImplementation(async function (this: MockAnalysisProvider, input) {
      await gate;
      return original.call(this, input);
    });

    const generating = generateNextProbePair(stores);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await answerCurrentProbe({ probeId: "s1-main", answer: "A" }, stores);
    release();
    await generating;

    const workspace = (await stores.workspaceStore.read())!;
    expect(workspace.probeSteps[0].mainAnswer).toBe("A");
    expect(workspace.cursor).toEqual({ stepIndex: 0, kind: "easier" });
    expect(workspace.probeSteps[1].status).toBe("ready");
  });

  it("a failed generation is marked failed and can be retried", async () => {
    vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair").mockRejectedValueOnce(new Error("boom"));

    await expect(generateNextProbePair(stores)).rejects.toThrow(ApiError);
    expect(await statuses()).toEqual(["ready", "failed", "pending"]);

    await generateNextProbePair(stores);
    expect(await statuses()).toEqual(["ready", "ready", "pending"]);
  });
});
