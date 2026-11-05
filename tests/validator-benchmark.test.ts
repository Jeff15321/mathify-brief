import { describe, expect, it } from "vitest";
import {
  createValidatorBenchmarkCases,
  summarizeValidatorBenchmark,
  type ValidatorBenchmarkCallResult,
} from "../scripts/validator-benchmark-data";

describe("validator benchmark fixtures", () => {
  it("contains two unmodified controls and eight single-fault cases", async () => {
    const cases = await createValidatorBenchmarkCases();
    const controls = cases.filter((testCase) => testCase.expectedCategories.length === 0);
    const seededFaults = cases.filter((testCase) => testCase.expectedCategories.length === 1);

    expect(cases).toHaveLength(10);
    expect(controls.map((testCase) => testCase.id)).toEqual([
      "breakdown-control",
      "probes-control",
    ]);
    expect(seededFaults).toHaveLength(8);
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(10);
  });

  it("keeps the clean probe fixture mathematically coherent", async () => {
    const testCase = (await createValidatorBenchmarkCases()).find(
      (candidate) => candidate.id === "probes-control",
    );
    const firstStep = testCase?.steps[0];

    expect(firstStep?.main?.options.find((option) => option.id === firstStep.main?.correctOptionId)?.textMarkdown)
      .toBe("$2x + 6$");
    expect(firstStep?.easier?.options.find((option) => option.id === firstStep.easier?.correctOptionId)?.textMarkdown)
      .toBe("$2x + 2$");
    expect(firstStep?.main?.concept).toBe(firstStep?.easier?.concept);
  });

  it("reports detections, missed faults, false alarms, and call failures separately", () => {
    const results: ValidatorBenchmarkCallResult[] = [
      {
        id: "control",
        scope: "probes",
        expectedCategories: [],
        issues: [],
        latencyMs: 1,
        error: null,
      },
      {
        id: "detected",
        scope: "probes",
        expectedCategories: ["answer_key"],
        issues: [{
          severity: "error",
          category: "answer_key",
          message: "The key is wrong.",
        }],
        latencyMs: 2,
        error: null,
      },
      {
        id: "wrong-category",
        scope: "probes",
        expectedCategories: ["hint_leak"],
        issues: [{
          severity: "warning",
          category: "other",
          message: "A non-matching finding.",
        }],
        latencyMs: 3,
        error: null,
      },
      {
        id: "failed",
        scope: "breakdown",
        expectedCategories: ["missing_prerequisite"],
        issues: [],
        latencyMs: 4,
        error: "Provider unavailable.",
      },
    ];
    const summary = summarizeValidatorBenchmark(results);

    expect(summary.completedCalls).toBe(3);
    expect(summary.failedCalls).toBe(1);
    expect(summary.seededFaultsDetected).toBe(1);
    expect(summary.seededFaultsMissed).toBe(2);
    expect(summary.seededFaultDetectionRate).toBe(1 / 3);
    expect(summary.flaggedCleanControls).toBe(0);
    expect(summary.cleanFalseAlarmRate).toBe(0);
    expect(summary.unclassifiedIssues).toBe(0);
    expect(summary.unexpectedCategoryIssues).toBe(1);
  });
});
