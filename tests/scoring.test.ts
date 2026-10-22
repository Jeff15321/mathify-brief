import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { answerCurrentProbe, generateNextProbePair } from "@/server/probe-service";
import { submitBrief } from "@/server/brief-service";
import { setupWorkspace, type Stores } from "./helpers";

// Mock keys: s1-main B, s1-easier B, s2-main C, s2-easier B, s3-main B.
describe("Deterministic scoring (mocked AI provider, isolated temp storage)", () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace("scoring"));
  });

  afterEach(async () => {
    await cleanup();
  });

  async function answer(probeId: string, value: "A" | "B" | "C" | "D" | "IDK") {
    await generateNextProbePair(stores);
    await answerCurrentProbe({ probeId, answer: value }, stores);
  }

  it("scores served probes, retries and unreached steps; counts are computed server-side", async () => {
    await answer("s1-main", "A"); // incorrect -> easier
    await answer("s1-easier", "B"); // correct
    await answer("s2-main", "IDK"); // don't know -> easier
    // s2-easier is on screen and left unanswered; step 3 is never reached.

    const brief = await submitBrief({ whiteboardPng: null }, stores);

    expect(brief.results.map((r) => [r.probeId, r.outcome])).toEqual([
      ["s1-main", "incorrect"],
      ["s1-easier", "correct"],
      ["s2-main", "dont_know"],
      ["s2-easier", "unanswered"],
    ]);
    expect(brief.notReachedConcepts).toEqual(["Solving for x"]);
    expect(brief.core).toEqual({ total: 3, attempted: 2, correct: 0, incorrect: 1, dontKnow: 1 });
    expect(brief.retries).toEqual({ total: 2, attempted: 1, correct: 1, incorrect: 0, dontKnow: 0 });
    expect(brief.strengths).toEqual(["Distributive property (easier)"]);
    expect(brief.gaps).toEqual(["Inverse operations"]);
    expect(brief.priorityStepIndex).toBe(0);
  });

  it("all-correct answers serve no retries", async () => {
    await answer("s1-main", "B");
    await answer("s2-main", "C");
    await answer("s3-main", "B");

    const brief = await submitBrief({ whiteboardPng: null }, stores);
    expect(brief.results).toHaveLength(3);
    expect(brief.core).toEqual({ total: 3, attempted: 3, correct: 3, incorrect: 0, dontKnow: 0 });
    expect(brief.retries.total).toBe(0);
    expect(brief.gaps).toEqual([]);
    expect(brief.priorityStepIndex).toBeNull();
  });

  it("allows submitting before answering anything", async () => {
    const brief = await submitBrief({ whiteboardPng: null }, stores);
    expect(brief.core).toEqual({ total: 3, attempted: 0, correct: 0, incorrect: 0, dontKnow: 0 });
    expect(brief.results.map((r) => r.outcome)).toEqual(["unanswered"]);
    expect(brief.strengths).toEqual([]);
    expect(brief.priorityStepIndex).toBeNull();
  });
});
