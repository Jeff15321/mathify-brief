/**
 * Standalone validation script — runs AI validation on the current workspace's
 * analysis and probes without starting the dev server.
 *
 * Usage:
 *   AI_VALIDATION_ENABLED=true npx tsx scripts/validate-analysis.ts
 *
 * Requires:
 *   - A workspace with analysis data (run the app first to create one)
 *   - ANTHROPIC_API_KEY in env (unless using AI_MOCK_MODE=true)
 *   - AI_VALIDATION_ENABLED=true (explicit opt-in)
 */

import { getStores } from "../src/server/storage";
import { validateBreakdown, validateProbes } from "../src/server/validation-service";

async function main() {
  // Ensure validation is enabled
  if (process.env.AI_VALIDATION_ENABLED !== "true") {
    console.error("❌  AI_VALIDATION_ENABLED must be set to 'true' to run validation.");
    console.error("   Usage: AI_VALIDATION_ENABLED=true npx tsx scripts/validate-analysis.ts");
    process.exit(1);
  }

  console.log("🔍 Loading workspace…");
  const { workspaceStore, assetStore } = getStores();
  const workspace = await workspaceStore.read();

  if (!workspace) {
    console.error("❌  No workspace found. Start the app and submit a question first.");
    process.exit(1);
  }

  if (!workspace.analysis) {
    console.error("❌  Workspace has no analysis. Submit a question and wait for analysis to complete.");
    process.exit(1);
  }

  console.log(`📝 Question: ${workspace.questionText || "(from uploaded files)"}`);
  console.log(`   Topic: ${workspace.analysis.topic}`);
  console.log(`   Breakdown steps: ${workspace.analysis.breakdown.length}`);
  console.log(`   Probe steps: ${workspace.probeSteps.length}`);
  console.log();

  // Load files
  const files: import("../src/server/ai/provider").StoredFile[] = [];
  for (const attachment of workspace.attachments) {
    const loaded = await assetStore.get(attachment.id);
    if (loaded) {
      files.push({
        fileName: loaded.meta.fileName,
        mimeType: loaded.meta.mimeType as import("../src/types/domain").MimeType,
        bytes: loaded.bytes,
      });
    }
  }
  if (files.length > 0) {
    console.log(`📎 Loaded ${files.length} attachment(s) for validation`);
  }

  // Run breakdown validation
  console.log("\n1️⃣  Validating breakdown…");
  const breakdownResult = await validateBreakdown(workspace.questionText, workspace.analysis, files);

  if (breakdownResult.status === "skipped") {
    console.log("   ⏭️  Skipped (AI_VALIDATION_ENABLED not set)");
  } else if (breakdownResult.status === "failed") {
    console.log("   ❌  Validation call failed");
    for (const issue of breakdownResult.issues) {
      console.log(`   - [${issue.severity}] ${issue.message}`);
    }
  } else if (breakdownResult.issues.length === 0) {
    console.log("   ✅  No issues found");
  } else {
    console.log(`   ⚠️  Found ${breakdownResult.issues.length} issue(s):`);
    for (const issue of breakdownResult.issues) {
      console.log(`   - [${issue.severity}] ${issue.message}`);
    }
  }

  // Run probe validation
  console.log("\n2️⃣  Validating probes…");
  const probesResult = await validateProbes(workspace.questionText, workspace.probeSteps, files);

  if (probesResult.status === "skipped") {
    console.log("   ⏭️  Skipped (AI_VALIDATION_ENABLED not set)");
  } else if (probesResult.status === "failed") {
    console.log("   ❌  Validation call failed");
    for (const issue of probesResult.issues) {
      console.log(`   - [${issue.severity}] ${issue.message}${issue.probeId ? ` (probe: ${issue.probeId})` : ""}`);
    }
  } else if (probesResult.issues.length === 0) {
    console.log("   ✅  No issues found");
  } else {
    console.log(`   ⚠️  Found ${probesResult.issues.length} issue(s):`);
    for (const issue of probesResult.issues) {
      console.log(`   - [${issue.severity}] ${issue.message}${issue.probeId ? ` (probe: ${issue.probeId})` : ""}`);
    }
  }

  // Store results on workspace
  const allIssues = [...breakdownResult.issues, ...probesResult.issues];
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

  console.log("\n💾 Validation results saved to workspace.");
  console.log(`   Total issues: ${allIssues.length}`);
  console.log("   Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
