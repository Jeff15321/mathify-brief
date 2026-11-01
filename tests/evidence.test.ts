import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TEST_QUESTIONS } from "@/lib/test-questions";
import { EXAMPLE_QUESTIONS } from "@/lib/example-data";
import { summarizeBrief } from "@/server/helpers/brief-summary-helper";

const deck = readFileSync(path.resolve("public", "stakeholder-deck.html"), "utf8");

describe("Independent reference arithmetic (not model accuracy)", () => {
  it("solves the bracket equation by substitution", () => {
    const x = (14 - 2 * 3) / 2;
    expect(x).toBe(4);
    expect(2 * (x + 3)).toBe(14);
  });
  it("checks factoring by coefficient expansion", () => {
    const a = 2, b = 3;
    expect([1, a + b, a * b]).toEqual([1, 5, 6]);
  });
  it("checks the positive hypotenuse", () => {
    expect(Math.sqrt(3 ** 2 + 4 ** 2)).toBe(5);
  });
  it("checks sine as opposite divided by hypotenuse", () => {
    expect(5 / 13).toBeCloseTo(0.3846153846);
    expect(deck).toContain("sin θ = 5/13");
  });
  it("scales the recipe at a constant rate", () => {
    expect((2 / 12) * 30).toBe(5);
  });
  it("checks the intersection in both original equations", () => {
    const x = (7 - 1) / (2 + 1);
    const y = 2 * x + 1;
    expect([x, y]).toEqual([2, 5]);
    expect(y).toBe(-x + 7);
  });
  it("checks circle area, rounding, and units", () => {
    expect((Math.PI * 7 ** 2).toFixed(1)).toBe("153.9");
    expect(deck).toContain("153.9 cm²");
  });
  it("checks exponent reduction for nonzero inputs and retains the excluded domain", () => {
    for (const x of [-3, -1, 0.5, 2, 5]) {
      expect((2 * x ** 3) ** 2 / (4 * x ** 2)).toBeCloseTo(x ** 4);
    }
    expect(deck).toContain("x⁴; x ≠ 0");
  });
});

describe("Evidence integrity", () => {
  it("covers the eight existing reference cases without reporting a live success rate", () => {
    expect(TEST_QUESTIONS).toHaveLength(8);
    expect(deck).toContain("no live-model accuracy percentage claimed");
    expect(deck).toContain("Zero tutor responses");
    expect(deck).toContain("not an actual student or live-model accuracy result");
    expect(deck).not.toMatch(/<script[^>]+src=|<link[^>]+href=/i);
    expect(deck).not.toContain("\u2014");
    expect(readFileSync(path.resolve("public", "Mathify-stakeholder-evidence.pptx")).subarray(0, 2).toString()).toBe("PK");
  });
  it.each(EXAMPLE_QUESTIONS)("keeps the simulated summary consistent for $id", (example) => {
    const calculated = summarizeBrief(example.simulatedBrief.results, example.simulatedBrief.notReachedConcepts);
    expect(calculated.core).toEqual(example.simulatedBrief.core);
    expect(calculated.retries).toEqual(example.simulatedBrief.retries);
    expect(calculated.gaps).toEqual(example.simulatedBrief.gaps);
    expect(calculated.strengths).toEqual(example.simulatedBrief.strengths);
    expect(calculated.priorityStepIndex).toBe(example.simulatedBrief.priorityStepIndex);
  });
});
