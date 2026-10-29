import { describe, expect, it } from "vitest";
import { advance, computeResults, stepToGenerate, STALE_GENERATION_MS, toPublicProbing } from "@/server/helpers/probe-flow-helper";
import type { PrivateProbe, ProbeCursor, ProbeStep } from "@/types/domain";

function probe(id: string, correct: "A" | "B" | "C" | "D" = "B"): PrivateProbe {
  return {
    id,
    concept: "Concept",
    questionMarkdown: `Question ${id}`,
    options: (["A", "B", "C", "D"] as const).map((optionId) => ({ id: optionId, textMarkdown: `opt ${optionId}` })),
    correctOptionId: correct,
    explanation: "Because.",
    hint: "Try thinking about the key concept.",
  };
}

function step(index: number, overrides: Partial<ProbeStep> = {}): ProbeStep {
  return {
    index,
    concept: `Concept ${index + 1}`,
    status: "ready",
    generationStartedAt: null,
    main: probe(`s${index + 1}-main`),
    easier: probe(`s${index + 1}-easier`),
    mainAnswer: null,
    easierAnswer: null,
    easierServed: false,
    mainShownAt: null,
    mainAnsweredAt: null,
    easierShownAt: null,
    easierAnsweredAt: null,
    ...overrides,
  };
}

const steps3 = (): ProbeStep[] => [step(0), step(1), step(2)];
const at = (stepIndex: number, kind: "main" | "easier" = "main"): ProbeCursor => ({ stepIndex, kind });

describe("advance()", () => {
  it("a correct main answer moves to the next step's main question", () => {
    const { steps, cursor } = advance(steps3(), at(0), "B");
    expect(cursor).toEqual(at(1));
    expect(steps[0].mainAnswer).toBe("B");
    expect(steps[0].easierServed).toBe(false);
  });

  it.each(["A", "IDK"] as const)("a %s main answer serves the same step's easier question", (answer) => {
    const { steps, cursor } = advance(steps3(), at(0), answer);
    expect(cursor).toEqual(at(0, "easier"));
    expect(steps[0].easierServed).toBe(true);
  });

  it.each(["A", "B", "IDK"] as const)("any easier answer (%s) moves on: at most one retry per step", (answer) => {
    const start = advance(steps3(), at(0), "A");
    const { steps, cursor } = advance(start.steps, start.cursor!, answer);
    expect(cursor).toEqual(at(1));
    expect(steps[0].easierAnswer).toBe(answer);
  });

  it("finishing the last step sets the cursor to null", () => {
    expect(advance(steps3(), at(2), "B").cursor).toBeNull();
    const retry = advance(steps3(), at(2), "IDK");
    expect(advance(retry.steps, retry.cursor!, "C").cursor).toBeNull();
  });

  it("does not mutate its input", () => {
    const input = steps3();
    advance(input, at(0), "A");
    expect(input[0].mainAnswer).toBeNull();
  });
});

describe("stepToGenerate()", () => {
  const pending = (i: number) => step(i, { status: "pending", main: null, easier: null });

  it("buffers only one step ahead of the cursor", () => {
    expect(stepToGenerate([step(0), pending(1), pending(2)], at(0), { includeFailed: false })).toBe(1);
    expect(stepToGenerate([step(0), step(1), pending(2)], at(0), { includeFailed: false })).toBeNull();
  });

  it("prefers the cursor's own step when it is missing", () => {
    expect(stepToGenerate([step(0), pending(1), pending(2)], at(1), { includeFailed: false })).toBe(1);
  });

  it("retries failed steps only when asked, and recovers stale generating steps", () => {
    const failed = [step(0), step(1, { status: "failed", main: null, easier: null })];
    expect(stepToGenerate(failed, at(0), { includeFailed: false })).toBeNull();
    expect(stepToGenerate(failed, at(0), { includeFailed: true })).toBe(1);

    const startedAt = new Date(0).toISOString();
    const stuck = [step(0), step(1, { status: "generating", generationStartedAt: startedAt, main: null, easier: null })];
    expect(stepToGenerate(stuck, at(0), { includeFailed: false, now: 1000 })).toBeNull();
    expect(stepToGenerate(stuck, at(0), { includeFailed: false, now: STALE_GENERATION_MS + 1 })).toBe(1);
  });

  it("returns null once the flow is finished", () => {
    expect(stepToGenerate(steps3(), null, { includeFailed: true })).toBeNull();
  });
});

describe("computeResults()", () => {
  it("includes served probes only and lists steps not reached", () => {
    let state = advance(steps3(), at(0), "A"); // wrong -> easier
    state = advance(state.steps, state.cursor!, "B"); // easier correct -> step 2
    const { results, notReachedConcepts } = computeResults(state.steps, state.cursor);

    expect(results.map((r) => [r.probeId, r.kind, r.outcome])).toEqual([
      ["s1-main", "main", "incorrect"],
      ["s1-easier", "easier", "correct"],
      ["s2-main", "main", "unanswered"], // on screen at submit time
    ]);
    expect(notReachedConcepts).toEqual(["Concept 3"]);
  });

  it("scores IDK as dont_know with no selected option", () => {
    const { results } = computeResults(advance(steps3(), at(0), "IDK").steps, at(0, "easier"));
    expect(results[0]).toMatchObject({ outcome: "dont_know", selectedOptionId: null, isCorrect: null });
    expect(results[1]).toMatchObject({ kind: "easier", outcome: "unanswered" });
  });
});

describe("toPublicProbing()", () => {
  it("exposes only the current probe and a waiting state when its step is not ready", () => {
    const steps = [step(0), step(1, { status: "generating", main: null, easier: null })];
    const view = toPublicProbing(steps, at(1), "rev");
    expect(view.current).toBeNull();
    expect(view.waitingStatus).toBe("generating");
    expect(view.progress).toEqual({ stepNumber: 2, totalSteps: 2, isEasier: false });
    expect(JSON.stringify(view)).not.toContain("correctOptionId");
  });
});
