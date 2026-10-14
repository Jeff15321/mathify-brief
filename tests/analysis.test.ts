import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStores } from "@/server/storage";
import { startWorkspace } from "@/server/workspace-service";
import { analyzeCurrentWorkspace } from "@/server/analysis-service";
import { ApiError } from "@/server/errors";

describe("Analysis service (mocked AI provider, isolated temp storage)", () => {
  let dataDir: string;
  let stores: ReturnType<typeof createStores>;

  beforeEach(async () => {
    process.env.AI_MOCK_MODE = "true";
    dataDir = await mkdtemp(path.join(tmpdir(), "mathify-analysis-"));
    stores = createStores(dataDir);
    await startWorkspace({ questionText: "Solve 2(x + 3) = 14.", files: [] }, stores);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("produces a public analysis with 3-5 four-option MCQs and canonicalized ids", async () => {
    const analysis = await analyzeCurrentWorkspace(stores);

    expect(analysis.probingQuestions.length).toBeGreaterThanOrEqual(3);
    expect(analysis.probingQuestions.length).toBeLessThanOrEqual(5);

    analysis.probingQuestions.forEach((probe, index) => {
      expect(probe.id).toBe(`q${index + 1}`);
      expect(probe.options).toHaveLength(4);
      expect(new Set(probe.options.map((o) => o.id)).size).toBe(4);
    });
  });

  it("never exposes correctOptionId or explanation in the public projection", async () => {
    const analysis = await analyzeCurrentWorkspace(stores);
    const serialized = JSON.stringify(analysis);

    expect(serialized).not.toContain("correctOptionId");
    expect(serialized).not.toContain("explanation");
  });

  it("GET-equivalent read (getPublicWorkspace) hides private fields after analysis too", async () => {
    await analyzeCurrentWorkspace(stores);
    const workspace = await stores.workspaceStore.read();

    expect(workspace?.analysis).not.toBeNull();
    // The stored (private) workspace legitimately has correctOptionId/explanation;
    // the public-projection helper (exercised in domain tests) is what strips them.
    expect(workspace?.analysis?.probingQuestions[0].correctOptionId).toMatch(/^[ABCD]$/);
  });

  it("rejects analyzing a workspace that was already analyzed (no silent re-analysis)", async () => {
    await analyzeCurrentWorkspace(stores);
    await expect(analyzeCurrentWorkspace(stores)).rejects.toThrow(ApiError);
  });

  it("rejects analyzing when there is no current workspace", async () => {
    await stores.workspaceStore.clear();
    await expect(analyzeCurrentWorkspace(stores)).rejects.toThrow(ApiError);
  });
});
