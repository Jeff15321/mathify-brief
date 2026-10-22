import { describe, expect, it } from "vitest";
import { summarizeBrief } from "@/server/helpers/brief-summary-helper";
import type { ProbeKind, ProbeOutcome, ProbeResult } from "@/types/domain";

function result(stepIndex: number, kind: ProbeKind, outcome: ProbeOutcome): ProbeResult {
  return {
    probeId: `s${stepIndex + 1}-${kind}`,
    stepIndex,
    kind,
    concept: kind === "main" ? `Concept ${stepIndex + 1}` : `Concept ${stepIndex + 1} reworded`,
    questionMarkdown: "Q",
    selectedOptionId: outcome === "correct" ? "B" : outcome === "incorrect" ? "A" : null,
    selectedOptionText: null,
    correctOptionId: "B",
    correctOptionText: "b",
    isCorrect: outcome === "correct" ? true : outcome === "incorrect" ? false : null,
    outcome,
    explanation: "e",
  };
}

describe("summarizeBrief()", () => {
  it("tallies main and easier probes separately; IDK counts as attempted, unanswered does not", () => {
    const summary = summarizeBrief(
      [
        result(0, "main", "incorrect"),
        result(0, "easier", "correct"),
        result(1, "main", "dont_know"),
        result(1, "easier", "unanswered"),
      ],
      ["Concept 3"],
    );

    expect(summary.core).toEqual({ total: 3, attempted: 2, correct: 0, incorrect: 1, dontKnow: 1 });
    expect(summary.retries).toEqual({ total: 2, attempted: 1, correct: 1, incorrect: 0, dontKnow: 0 });
  });

  it("treats a missed main question as a gap even when its easier retry was correct", () => {
    const summary = summarizeBrief(
      [result(0, "main", "correct"), result(1, "main", "incorrect"), result(1, "easier", "correct"), result(2, "main", "dont_know"), result(2, "easier", "incorrect")],
      [],
    );

    expect(summary.strengths).toEqual(["Concept 1"]);
    expect(summary.gaps).toEqual(["Concept 2", "Concept 3"]);
  });

  it("picks the first step in plan order whose main answer was incorrect or I don't know", () => {
    expect(
      summarizeBrief([result(0, "main", "correct"), result(1, "main", "dont_know"), result(1, "easier", "correct"), result(2, "main", "incorrect")], [])
        .priorityStepIndex,
    ).toBe(1);
  });

  it("has no priority when every main answer was correct or nothing was answered", () => {
    expect(summarizeBrief([result(0, "main", "correct"), result(1, "main", "correct")], []).priorityStepIndex).toBeNull();
    const empty = summarizeBrief([result(0, "main", "unanswered")], ["Concept 2"]);
    expect(empty.priorityStepIndex).toBeNull();
    expect(empty.strengths).toEqual([]);
    expect(empty.gaps).toEqual([]);
    expect(empty.retries.total).toBe(0);
  });
});
