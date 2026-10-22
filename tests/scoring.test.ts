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
    expect(brief.answeredCount).toBe(2);
    expect(brief.correctCount).toBe(1);
    expect(brief.dontKnowCount).toBe(1);
    expect(brief.unansweredCount).toBe(2);
    expect(brief.retriesServed).toBe(2);
    expect(brief.retriesCorrect).toBe(1);
  });

  it("all-correct answers serve no retries", async () => {
    await answer("s1-main", "B");
    await answer("s2-main", "C");
    await answer("s3-main", "B");

    const brief = await submitBrief({ whiteboardPng: null }, stores);
    expect(brief.results).toHaveLength(3);
    expect(brief.correctCount).toBe(3);
    expect(brief.retriesServed).toBe(0);
    expect(brief.unansweredCount).toBe(0);
  });

  it("allows submitting before answering anything", async () => {
    const brief = await submitBrief({ whiteboardPng: null }, stores);
    expect(brief.answeredCount).toBe(0);
    expect(brief.results.map((r) => r.outcome)).toEqual(["unanswered"]);
    expect(brief.unansweredCount).toBe(3);
  });
});
