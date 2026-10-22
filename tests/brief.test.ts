import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitBrief } from "@/server/brief-service";
import { answerCurrentProbe } from "@/server/probe-service";
import { startWorkspace } from "@/server/workspace-service";
import { ApiError } from "@/server/errors";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { probeAnswerSchema } from "@/schemas/workspace";
import { setupWorkspace, type Stores } from "./helpers";

const TINY_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe("Brief submission (mocked AI provider, isolated temp storage)", () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace("brief"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  it("persists phase: complete and the full brief, including answer keys in results", async () => {
    const brief = await submitBrief({ whiteboardPng: null }, stores);
    expect(brief.briefVersion).toBe(4);
    expect(brief.results[0].correctOptionId).toMatch(/^[ABCD]$/);

    const workspace = await stores.workspaceStore.read();
    expect(workspace?.phase).toBe("complete");
    expect(workspace?.brief).not.toBeNull();
  });

  it("stores no whiteboard asset when no PNG is submitted (blank whiteboard omitted)", async () => {
    await submitBrief({ whiteboardPng: null }, stores);
    const workspace = await stores.workspaceStore.read();
    expect(workspace?.whiteboardAsset).toBeNull();
  });

  it("stores and serves the whiteboard asset only when a nonblank PNG is submitted", async () => {
    await submitBrief({ whiteboardPng: TINY_PNG }, stores);

    const workspace = await stores.workspaceStore.read();
    expect(workspace?.whiteboardAsset).not.toBeNull();

    const asset = await stores.assetStore.get(workspace!.whiteboardAsset!.id);
    expect(asset?.bytes.equals(TINY_PNG)).toBe(true);
  });

  it("builds the brief without any AI call", async () => {
    const analyze = vi.spyOn(MockAnalysisProvider.prototype, "analyzeQuestion");
    const pair = vi.spyOn(MockAnalysisProvider.prototype, "generateProbePair");
    await submitBrief({ whiteboardPng: TINY_PNG }, stores);
    expect(analyze).not.toHaveBeenCalled();
    expect(pair).not.toHaveBeenCalled();
  });

  it("rejects a second brief submission once complete (no regeneration)", async () => {
    await submitBrief({ whiteboardPng: null }, stores);
    await expect(submitBrief({ whiteboardPng: null }, stores)).rejects.toThrow(ApiError);
  });

  it("rejects answering once the brief is complete", async () => {
    await submitBrief({ whiteboardPng: null }, stores);
    await expect(answerCurrentProbe({ probeId: "s1-main", answer: "B" }, stores)).rejects.toThrow(ApiError);
  });

  it("rejects brief submission before analysis has run", async () => {
    await startWorkspace({ questionText: "No analysis yet", files: [] }, stores);
    await expect(submitBrief({ whiteboardPng: null }, stores)).rejects.toThrow(ApiError);
  });
});

describe("Answer schema", () => {
  it("accepts A-D and IDK answers, rejects anything else", () => {
    expect(probeAnswerSchema.safeParse("A").success).toBe(true);
    expect(probeAnswerSchema.safeParse("IDK").success).toBe(true);
    expect(probeAnswerSchema.safeParse("E").success).toBe(false);
  });
});
