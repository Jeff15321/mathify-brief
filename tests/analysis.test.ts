import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { analyzeCurrentWorkspace } from "@/server/analysis-service";
import { getPublicWorkspace } from "@/server/workspace-service";
import { ApiError } from "@/server/errors";
import { setupWorkspace, type Stores } from "./helpers";

describe("Analysis service (mocked AI provider, isolated temp storage)", () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace("analysis", { analyze: false }));
  });

  afterEach(async () => {
    await cleanup();
  });

  it("plans 3-5 steps, generates only the first pair, and puts the cursor on step 1", async () => {
    await analyzeCurrentWorkspace(stores);
    const workspace = (await stores.workspaceStore.read())!;

    expect(workspace.phase).toBe("ready");
    expect(workspace.probeSteps.length).toBeGreaterThanOrEqual(3);
    expect(workspace.probeSteps.length).toBeLessThanOrEqual(5);
    expect(workspace.cursor).toEqual({ stepIndex: 0, kind: "main" });

    const [first, ...rest] = workspace.probeSteps;
    expect(first.status).toBe("ready");
    expect(first.main?.id).toBe("s1-main");
    expect(first.easier?.id).toBe("s1-easier");
    expect(first.main?.options).toHaveLength(4);
    rest.forEach((step) => {
      expect(step.status).toBe("pending");
      expect(step.main).toBeNull();
    });
  });

  it("the public view shows only the current probe: no keys, explanations or buffered probes", async () => {
    const analysis = await analyzeCurrentWorkspace(stores);
    const publicWorkspace = (await getPublicWorkspace(stores))!;
    const serialized = JSON.stringify({ analysis, publicWorkspace });

    expect(publicWorkspace.probing?.current?.id).toBe("s1-main");
    expect(serialized).not.toContain("correctOptionId");
    expect(serialized).not.toContain("explanation");
    expect(serialized).not.toContain("s1-easier");
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
