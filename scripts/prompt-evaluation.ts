/**
 * Prompt evaluation script — runs the AI analysis pipeline against a set of
 * canonical test questions and outputs structured results for analysis.
 *
 * Usage:
 *   npx tsx scripts/prompt-evaluation.ts [--json] [--quiet]
 *
 * Options:
 *   --json    Output results as JSON (for piping to analysis tools)
 *   --quiet   Suppress per-question progress output
 *
 * Requires ANTHROPIC_API_KEY in env (unless AI_MOCK_MODE=true).
 */

import { TEST_QUESTIONS, type TestQuestion } from "../src/lib/test-questions";
import { getAnalysisProvider } from "../src/server/ai";
import type { AnalyzeQuestionInput } from "../src/server/ai/provider";
import type { ModelAnalysis, ModelProbePair } from "../src/schemas/analysis";

interface EvalResult {
  providerMode: "mock" | "live";
  questionId: string;
  grade: number;
  questionText: string;
  expectedTopic: string;
  actualTopic: string;
  topicMatch: boolean;
  breakdownSteps: number;
  minBreakdownSteps: number;
  breakdownSufficient: boolean;
  gradeDifficulty: string;
  probePlanLength: number;
  firstPairGenerated: boolean;
  latencyMs: number;
  error: string | null;
  probeError: string | null;
  analysis: ModelAnalysis | null;
  firstPair: ModelProbePair | null;
}

async function evaluateQuestion(question: TestQuestion): Promise<EvalResult> {
  const provider = getAnalysisProvider();
  const input: AnalyzeQuestionInput = {
    grade: question.grade,
    questionText: question.questionText,
    files: [],
  };

  const start = Date.now();
  const providerMode = process.env.AI_MOCK_MODE !== "false" ? "mock" : "live";
  try {
    const analysis = await provider.analyzeQuestion(input);
    const latencyMs = Date.now() - start;

    // Also try generating the first probe pair
    let firstPairGenerated = false;
    let firstPair: ModelProbePair | null = null;
    let probeError: string | null = null;
    try {
      const pair = await provider.generateProbePair({
        grade: question.grade,
        parsedQuestionMarkdown: analysis.parsedQuestionMarkdown,
        plan: analysis.probePlan,
        stepIndex: 0,
      });
      firstPairGenerated = pair.main != null && pair.easier != null;
      firstPair = pair;
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }

    return {
      providerMode,
      questionId: question.id,
      grade: question.grade,
      questionText: question.questionText,
      expectedTopic: question.expectedTopic,
      actualTopic: analysis.topic,
      topicMatch:
        analysis.topic.toLowerCase().includes(question.expectedTopic.toLowerCase()) ||
        question.expectedTopic.toLowerCase().includes(analysis.topic.toLowerCase()),
      breakdownSteps: analysis.breakdown.length,
      minBreakdownSteps: question.minBreakdownSteps,
      breakdownSufficient: analysis.breakdown.length >= question.minBreakdownSteps,
      gradeDifficulty: analysis.gradeDifficulty,
      probePlanLength: analysis.probePlan.length,
      firstPairGenerated,
      latencyMs,
      error: null,
      probeError,
      analysis,
      firstPair,
    };
  } catch (err) {
    return {
      providerMode,
      questionId: question.id,
      grade: question.grade,
      questionText: question.questionText,
      expectedTopic: question.expectedTopic,
      actualTopic: "",
      topicMatch: false,
      breakdownSteps: 0,
      minBreakdownSteps: question.minBreakdownSteps,
      breakdownSufficient: false,
      gradeDifficulty: "",
      probePlanLength: 0,
      firstPairGenerated: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      probeError: null,
      analysis: null,
      firstPair: null,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const quiet = args.includes("--quiet");

  if (!quiet) {
    console.log(`🧪 Prompt Evaluation — ${TEST_QUESTIONS.length} test questions`);
    console.log(`   Provider: ${process.env.AI_MOCK_MODE !== "false" ? "mock (fixture-only; not model accuracy)" : "Anthropic (live)"}`);
    console.log();
  }

  const results: EvalResult[] = [];

  for (const question of TEST_QUESTIONS) {
    if (!quiet) {
      process.stdout.write(`   Evaluating ${question.id}… `);
    }
    const result = await evaluateQuestion(question);
    results.push(result);

    if (!quiet) {
      if (result.error) {
        console.log(`❌ (${result.latencyMs}ms) Error: ${result.error}`);
      } else {
        const topicIcon = result.topicMatch ? "✅" : "⚠️";
        const breakdownIcon = result.breakdownSufficient ? "✅" : "⚠️";
        console.log(
          `done (${result.latencyMs}ms) ${topicIcon} topic ${breakdownIcon} ${result.breakdownSteps}/${result.minBreakdownSteps} steps`,
        );
      }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Summary
  const successful = results.filter((r) => !r.error);
  const topicMatches = successful.filter((r) => r.topicMatch).length;
  const breakdownSufficient = successful.filter((r) => r.breakdownSufficient).length;
  const avgLatency =
    successful.length > 0 ? Math.round(successful.reduce((s, r) => s + r.latencyMs, 0) / successful.length) : 0;

  console.log("\n📊 Summary");
  console.log(`   Questions evaluated: ${results.length}`);
  console.log(`   Successful:          ${successful.length}`);
  console.log(`   Errors:              ${results.length - successful.length}`);
  console.log(`   Probe generation errors: ${results.filter(r => r.probeError).length}`);
  console.log("   Topic and step-count metrics are sanity checks, not mathematical accuracy.");
  console.log(`   Topic matches:       ${topicMatches}/${successful.length}`);
  console.log(`   Breakdown sufficient: ${breakdownSufficient}/${successful.length}`);
  console.log(`   Average latency:     ${avgLatency}ms`);

  if (successful.length > 0) {
    console.log("\n📋 Per-question breakdown:");
    for (const r of successful) {
      console.log(
        `   ${r.questionId}: ${r.breakdownSteps} steps, ${r.probePlanLength} probes planned, ` +
          `difficulty=${r.gradeDifficulty}, topic="${r.actualTopic}" ${r.topicMatch ? "✓" : "✗ expected: " + r.expectedTopic}`,
      );
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
