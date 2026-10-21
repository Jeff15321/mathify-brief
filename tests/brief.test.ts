import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStores } from "@/server/storage";
import { startWorkspace } from "@/server/workspace-service";
import { analyzeCurrentWorkspace } from "@/server/analysis-service";
import { submitBrief } from "@/server/brief-service";
import { ApiError } from "@/server/errors";
import { probeAnswersSchema, tutorBriefSchema } from "@/schemas/workspace";

const TINY_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe("Brief submission (mocked AI provider, isolated temp storage)", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;

  beforeEach(async () => {
    process.env.AI_MOCK_MODE = "true";
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-brief-"));
    stores = createStores(dataDir);
    await startWorkspace({ questionText: "Solve 2(x + 3) = 14.", files: [] }, stores);
    await analyzeCurrentWorkspace(stores);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("persists phase: complete and the full brief, including answer keys in results", async () => {
    const brief = await submitBrief({ answers: {}, whiteboardPng: null }, stores);
    expect(brief.promptVersion).toBe("brief-v2");

    const workspace = await stores.workspaceStore.read();
    expect(workspace?.phase).toBe("complete");
    expect(workspace?.brief).not.toBeNull();
  });

  it("stores no whiteboard asset when no PNG is submitted (blank whiteboard omitted)", async () => {
    await submitBrief({ answers: {}, whiteboardPng: null }, stores);
    const workspace = await stores.workspaceStore.read();
    expect(workspace?.whiteboardAsset).toBeNull();
  });

  it("stores and serves the whiteboard asset only when a nonblank PNG is submitted", async () => {
    const brief = await submitBrief({ answers: {}, whiteboardPng: TINY_PNG }, stores);
    expect(brief.whiteboardObservations.length).toBeGreaterThan(0);

    const workspace = await stores.workspaceStore.read();
    expect(workspace?.whiteboardAsset).not.toBeNull();

    const asset = await stores.assetStore.get(workspace!.whiteboardAsset!.id);
    expect(asset?.bytes.equals(TINY_PNG)).toBe(true);
  });

  it("rejects a second brief submission once complete (no regeneration)", async () => {
    await submitBrief({ answers: {}, whiteboardPng: null }, stores);
    await expect(submitBrief({ answers: {}, whiteboardPng: null }, stores)).rejects.toThrow(ApiError);
  });

  it("rejects brief submission before analysis has run", async () => {
    await stores.workspaceStore.clear();
    await startWorkspace({ questionText: "No analysis yet", files: [] }, stores);
    await expect(submitBrief({ answers: {}, whiteboardPng: null }, stores)).rejects.toThrow(ApiError);
  });
});

describe("Answer and brief schemas", () => {
  it("accepts A-D and IDK answers, rejects anything else", () => {
    expect(probeAnswersSchema.safeParse({ q1: "A", q2: "IDK" }).success).toBe(true);
    expect(probeAnswersSchema.safeParse({ q1: "E" }).success).toBe(false);
  });

  it("still loads a brief-v1 brief stored before \"I don't know\" existed", () => {
    const parsed = tutorBriefSchema.parse({
      summary: "s",
      gradeAssessment: "g",
      strengths: [],
      possibleGaps: [],
      whiteboardObservations: [],
      suggestedStartingPoint: "p",
      limitations: [],
      results: [
        {
          probeId: "q1",
          concept: "c",
          questionMarkdown: "q",
          selectedOptionId: null,
          selectedOptionText: null,
          correctOptionId: "A",
          correctOptionText: "a",
          isCorrect: null,
          explanation: "e",
        },
      ],
      answeredCount: 0,
      correctCount: 0,
      unansweredCount: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      model: "mock-provider",
      promptVersion: "brief-v1",
    });
    expect(parsed.dontKnowCount).toBe(0);
    expect(parsed.results[0].outcome).toBe("unanswered");
  });
});
