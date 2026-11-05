import { validateBreakdown, validateProbes } from "../src/server/validation-service";
import {
  BENCHMARK_QUESTION,
  createValidatorBenchmarkCases,
  summarizeValidatorBenchmark,
  type ValidatorBenchmarkCallResult,
} from "./validator-benchmark-data";

const BENCHMARK_VERSION = "validator-seeded-v1";

async function evaluateCase(
  testCase: Awaited<ReturnType<typeof createValidatorBenchmarkCases>>[number],
): Promise<ValidatorBenchmarkCallResult> {
  const startedAt = Date.now();
  const result = testCase.scope === "breakdown"
    ? await validateBreakdown(BENCHMARK_QUESTION, testCase.analysis)
    : await validateProbes(BENCHMARK_QUESTION, testCase.steps);
  const latencyMs = Date.now() - startedAt;
  const error = result.status === "failed"
    ? result.issues.map((issue) => issue.message).join("; ")
    : result.status === "skipped"
      ? "Validation was unexpectedly skipped."
      : null;

  return {
    id: testCase.id,
    scope: testCase.scope,
    expectedCategories: testCase.expectedCategories,
    issues: error === null ? result.issues : [],
    latencyMs,
    error,
  };
}

async function main() {
  const jsonOutput = process.argv.includes("--json");
  if (process.env.RUN_VALIDATOR_BENCHMARK !== "1") {
    throw new Error("Set RUN_VALIDATOR_BENCHMARK=1 to explicitly start live checker calls.");
  }
  if (process.env.AI_VALIDATION_ENABLED !== "true") {
    throw new Error("Set AI_VALIDATION_ENABLED=true to enable the validation service.");
  }
  if (process.env.AI_MOCK_MODE !== "false") {
    throw new Error("Set AI_MOCK_MODE=false; mocked empty issue lists are not benchmark evidence.");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for the live checker benchmark.");
  }

  const cases = await createValidatorBenchmarkCases();
  const results: ValidatorBenchmarkCallResult[] = [];
  for (const testCase of cases) {
    const result = await evaluateCase(testCase);
    results.push(result);
    if (!jsonOutput) {
      const state = result.error
        ? `CALL FAILED: ${result.error}`
        : result.expectedCategories.length === 0
          ? result.issues.length === 0 ? "no issues" : `false alarm: ${result.issues.length} issue(s)`
          : result.issues.some((issue) => result.expectedCategories.includes(issue.category ?? "other"))
            ? `expected category found: ${result.expectedCategories.join(", ")}`
            : `expected category missed: ${result.expectedCategories.join(", ")}`;
      console.log(`${result.id}: ${state} (${result.latencyMs}ms)`);
    }
  }

  const report = {
    metadata: {
      benchmarkVersion: BENCHMARK_VERSION,
      runAt: new Date().toISOString(),
      provider: "anthropic-live",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      fixtureSource: "Fixed MockAnalysisProvider fixture with scripted mutations.",
      limitations: [
        "Two unmodified fixture controls and eight planted faults are an exploratory harness, not a representative accuracy sample.",
        "The fixtures are not independently educator-reviewed.",
        "The checker uses the same provider as generation and is not independent ground truth.",
        "No success threshold or Mathify reliability claim is implied.",
      ],
    },
    summary: summarizeValidatorBenchmark(results),
    results,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\nSummary");
    console.log(`  Cases: ${report.summary.totalCases}`);
    console.log(`  Failed calls: ${report.summary.failedCalls}`);
    console.log(
      `  Seeded faults detected: ${report.summary.seededFaultsDetected}/${report.summary.seededFaults}`,
    );
    console.log(
      `  Clean fixture controls flagged: ${report.summary.flaggedCleanControls}/${report.summary.completedCleanControls}`,
    );
    console.log("  These are exploratory fixture results, not a model-accuracy score.");
  }

  if (report.summary.failedCalls > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
