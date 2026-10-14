import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStores } from "@/server/storage";
import { startWorkspace } from "@/server/workspace-service";
import { analyzeCurrentWorkspace } from "@/server/analysis-service";
import { submitBrief } from "@/server/brief-service";
import { ApiError } from "@/server/errors";

describe("Deterministic scoring (mocked AI provider, isolated temp storage)", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;

  beforeEach(async () => {
    process.env.AI_MOCK_MODE = "true";
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-scoring-"));
    stores = createStores(dataDir);
    await startWorkspace({ questionText: "Solve 2(x + 3) = 14.", files: [] }, stores);
    await analyzeCurrentWorkspace(stores);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  async function getPrivateProbes() {
    const workspace = await stores.workspaceStore.read();
    return workspace!.analysis!.probingQuestions;
  }

  it("distinguishes correct, incorrect, and unanswered; computed counts are server-side, not model-invented", async () => {
    const probes = await getPrivateProbes();
    const answers = {
      [probes[0].id]: probes[0].correctOptionId, // correct
      [probes[1].id]: (["A", "B", "C", "D"] as const).find((id) => id !== probes[1].correctOptionId)!, // incorrect
      // probes[2] left unanswered
    };

    const brief = await submitBrief({ answers, whiteboardPng: null }, stores);

    expect(brief.answeredCount).toBe(2);
    expect(brief.correctCount).toBe(1);
    expect(brief.unansweredCount).toBe(probes.length - 2);

    const r0 = brief.results.find((r) => r.probeId === probes[0].id)!;
    expect(r0.isCorrect).toBe(true);
    const r1 = brief.results.find((r) => r.probeId === probes[1].id)!;
    expect(r1.isCorrect).toBe(false);
    const r2 = brief.results.find((r) => r.probeId === probes[2].id)!;
    expect(r2.isCorrect).toBeNull();
    expect(r2.selectedOptionId).toBeNull();
  });

  it("allows zero answers (all unanswered) and still produces deterministic counts", async () => {
    const probes = await getPrivateProbes();
    const brief = await submitBrief({ answers: {}, whiteboardPng: null }, stores);

    expect(brief.answeredCount).toBe(0);
    expect(brief.correctCount).toBe(0);
    expect(brief.unansweredCount).toBe(probes.length);
  });

  it("rejects a forged/unknown probe id", async () => {
    await expect(
      submitBrief({ answers: { "not-a-real-probe": "A" }, whiteboardPng: null }, stores),
    ).rejects.toThrow(ApiError);
  });
});
