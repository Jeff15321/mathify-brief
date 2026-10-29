import { describe, expect, it } from "vitest";
import { computeConfidence } from "@/server/helpers/confidence-helper";
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

const at = (stepIndex: number, kind: "main" | "easier" = "main"): ProbeCursor => ({ stepIndex, kind });

describe("computeConfidence()", () => {
  it("returns high confidence when all questions answered correctly at normal speed", () => {
    const steps = [
      step(0, { mainAnswer: "B", mainShownAt: "2026-01-01T00:00:00.000Z", mainAnsweredAt: "2026-01-01T00:00:10.000Z" }),
      step(1, { mainAnswer: "B", mainShownAt: "2026-01-01T00:00:11.000Z", mainAnsweredAt: "2026-01-01T00:00:20.000Z" }),
      step(2, { mainAnswer: "B", mainShownAt: "2026-01-01T00:00:21.000Z", mainAnsweredAt: "2026-01-01T00:00:30.000Z" }),
    ];
    const result = computeConfidence(steps, null);
    expect(result.level).toBe("high");
    expect(result.earlyExit).toBe(false);
  });

  it("returns low confidence when correct rate suggests random clicking", () => {
    // All wrong — 0/3 correct, well below the random threshold
    const steps = [
      step(0, { mainAnswer: "A", mainShownAt: "2026-01-01T00:00:00.000Z", mainAnsweredAt: "2026-01-01T00:00:02.000Z" }),
      step(1, { mainAnswer: "A", mainShownAt: "2026-01-01T00:00:03.000Z", mainAnsweredAt: "2026-01-01T00:00:05.000Z" }),
      step(2, { mainAnswer: "A", mainShownAt: "2026-01-01T00:00:06.000Z", mainAnsweredAt: "2026-01-01T00:00:08.000Z" }),
    ];
    const result = computeConfidence(steps, null);
    expect(result.level).toBe("low");
    expect(result.factors.some((f) => f.factor === "Likely random clicking")).toBe(true);
  });

  it("returns low confidence for random clicking even without early exit", () => {
    // 1/3 correct = 33%, below random threshold, and finished all steps
    const steps = [
      step(0, { mainAnswer: "A" }),  // wrong
      step(1, { mainAnswer: "B" }),  // correct
      step(2, { mainAnswer: "C" }),  // wrong
    ];
    const result = computeConfidence(steps, null);
    expect(result.level).toBe("low");
    expect(result.earlyExit).toBe(false);
    expect(result.factors.some((f) => f.factor === "Likely random clicking")).toBe(true);
  });

  it("returns medium confidence for a mix of correct and wrong answers", () => {
    // 2/4 correct = 50%, above random but below high
    const steps = [
      step(0, { mainAnswer: "B" }),  // correct
      step(1, { mainAnswer: "A" }),  // wrong
      step(2, { mainAnswer: "B" }),  // correct
      step(3, { mainAnswer: "C" }),  // wrong
    ];
    const result = computeConfidence(steps, null);
    expect(result.level).toBe("medium");
  });

  it("returns low confidence with early exit + fast answers", () => {
    const steps = [
      step(0, {
        mainAnswer: "A",
        mainShownAt: "2026-01-01T00:00:00.000Z",
        mainAnsweredAt: "2026-01-01T00:00:01.000Z", // 1s — very fast
      }),
      step(1, {
        mainAnswer: "C",
        mainShownAt: "2026-01-01T00:00:02.000Z",
        mainAnsweredAt: "2026-01-01T00:00:03.000Z", // 1s — very fast
      }),
    ];
    const result = computeConfidence(steps, at(2)); // early exit
    expect(result.level).toBe("low");
    expect(result.earlyExit).toBe(true);
  });

  it("does not penalize IDK answers as incorrect for correct-rate purposes", () => {
    // 1 correct, 1 IDK, 1 wrong — only 1/3 actual answers correct (33%)
    // But IDK is excluded from correct-rate calculation (only non-IDK answers count)
    const steps = [
      step(0, { mainAnswer: "B" }),   // correct
      step(1, { mainAnswer: "IDK" }), // don't know
      step(2, { mainAnswer: "A" }),   // wrong
    ];
    const result = computeConfidence(steps, null);
    // 1 correct out of 2 non-IDK answers = 50%, so "Low correct rate" but not "Likely random clicking"
    expect(result.level).toBe("medium");
    expect(result.factors.some((f) => f.factor === "Likely random clicking")).toBe(false);
    expect(result.factors.some((f) => f.factor === "Self-reported uncertainty")).toBe(true);
  });

  it("returns high confidence when IDK is used but non-IDK answers are all correct", () => {
    const steps = [
      step(0, { mainAnswer: "B" }),   // correct
      step(1, { mainAnswer: "IDK" }), // don't know — genuine uncertainty
      step(2, { mainAnswer: "B" }),   // correct
    ];
    const result = computeConfidence(steps, null);
    expect(result.level).toBe("high");
    expect(result.factors.some((f) => f.factor === "Self-reported uncertainty")).toBe(true);
  });

  it("returns high for empty steps", () => {
    expect(computeConfidence([], null)).toEqual({ level: "high", factors: [], earlyExit: false });
  });
});
