import { validateBreakdown, validateProbes } from "@/server/validation-service";
import { getStores } from "@/server/storage";
import { ApiError, toApiErrorResponse } from "@/server/errors";
import { getAnalysisProvider } from "@/server/ai";

export const runtime = "nodejs";

/**
 * POST /api/validate — runs validation on the current workspace's analysis and probes.
 * Gated by AI_VALIDATION_ENABLED=true env var.
 */
export async function POST() {
  try {
    if (process.env.AI_VALIDATION_ENABLED !== "true") {
      throw new ApiError(403, "FORBIDDEN", "Validation is not enabled. Set AI_VALIDATION_ENABLED=true to use this endpoint.");
    }

    const { workspaceStore, assetStore } = getStores();
    const workspace = await workspaceStore.read();

    if (!workspace || !workspace.analysis) {
      throw new ApiError(404, "NOT_FOUND", "No analyzed workspace to validate");
    }

    // Load files for validation
    const files: import("@/server/ai/provider").StoredFile[] = [];
    for (const attachment of workspace.attachments) {
      const loaded = await assetStore.get(attachment.id);
      if (loaded) {
        files.push({ fileName: loaded.meta.fileName, mimeType: loaded.meta.mimeType, bytes: loaded.bytes });
      }
    }

    const [breakdownResult, probesResult] = await Promise.all([
      validateBreakdown(workspace.questionText, workspace.analysis, files),
      validateProbes(workspace.questionText, workspace.probeSteps, files),
    ]);

    const allIssues = [...breakdownResult.issues, ...probesResult.issues];

    // Store validation results on the workspace
    await workspaceStore.update((current) => {
      if (!current) return null!;
      return {
        ...current,
        validation: {
          status: breakdownResult.status === "done" && probesResult.status === "done" ? "done" : "partial",
          issues: allIssues,
          validatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });

    return Response.json(
      { validation: { breakdown: breakdownResult, probes: probesResult } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
