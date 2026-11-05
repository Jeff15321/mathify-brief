/**
 * Capture all generated analysis and probe pairs for the canonical examples.
 *
 * Usage:
 *   npx tsx scripts/prompt-evaluation.ts [--json] [--quiet]
 *
 * Mock mode is the default. Mock output verifies harness plumbing only.
 * Topic matching and breakdown length are sanity checks, not accuracy scores.
 */

import { TEST_QUESTIONS, type TestQuestion } from "../src/lib/test-questions";
import { getAnalysisProvider } from "../src/server/ai";
import type { AnalyzeQuestionInput } from "../src/server/ai/provider";
import type { ModelAnalysis, ModelProbePair } from "../src/schemas/analysis";

interface ProbePairArtifact {
  stepIndex: number;
  concept: string;
  source: "analysis-response" | "follow-up-call";
  latencyMs: number | null;
  pair: ModelProbePair | null;
  error: string | null;
}

interface EvalResult {
  questionId: string;
  grade: number;
  questionText: string;
  sourceContext: string;
  expectedTopic: string;
  analysisLatencyMs: number;
  analysisError: string | null;
  analysis: ModelAnalysis | null;
  sanityChecks: {
    topicMatch: boolean;
    breakdownSteps: number;
    minBreakdownSteps: number;
    breakdownMeetsMinimum: boolean;
  } | null;
  probeLatencyMs: number;
  probePairs: ProbePairArtifact[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function evaluateQuestion(question: TestQuestion): Promise<EvalResult> {
  const provider = getAnalysisProvider();
  const input: AnalyzeQuestionInput = {
    grade: question.grade,
    questionText: question.questionText,
    files: [],
  };
  const analysisStartedAt = Date.now();
  let analysis: ModelAnalysis;

  try {
    analysis = await provider.analyzeQuestion(input);
  } catch (error) {
    return {
      questionId: question.id,
      grade: question.grade,
      questionText: question.questionText,
      sourceContext: question.source,
      expectedTopic: question.expectedTopic,
      analysisLatencyMs: Date.now() - analysisStartedAt,
      analysisError: errorMessage(error),
      analysis: null,
      sanityChecks: null,
      probeLatencyMs: 0,
      probePairs: [],
    };
  }

  const analysisLatencyMs = Date.now() - analysisStartedAt;
  const probePairs: ProbePairArtifact[] = [{
    stepIndex: 0,
    concept: analysis.probePlan[0]?.concept ?? "Unplanned first pair",
    source: "analysis-response",
    latencyMs: null,
    pair: analysis.firstPair,
    error: null,
  }];
  let probeLatencyMs = 0;

  for (let stepIndex = 1; stepIndex < analysis.probePlan.length; stepIndex += 1) {
    const plan = analysis.probePlan[stepIndex];
    if (!plan) continue;

    const startedAt = Date.now();
    try {
      const pair = await provider.generateProbePair({
        grade: question.grade,
        parsedQuestionMarkdown: analysis.parsedQuestionMarkdown,
        plan: analysis.probePlan,
        stepIndex,
      });
      const latencyMs = Date.now() - startedAt;
      probeLatencyMs += latencyMs;
      probePairs.push({
        stepIndex,
        concept: plan.concept,
        source: "follow-up-call",
        latencyMs,
        pair,
        error: null,
      });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      probeLatencyMs += latencyMs;
      probePairs.push({
        stepIndex,
        concept: plan.concept,
        source: "follow-up-call",
        latencyMs,
        pair: null,
        error: errorMessage(error),
      });
    }
  }

  return {
    questionId: question.id,
    grade: question.grade,
    questionText: question.questionText,
    sourceContext: question.source,
    expectedTopic: question.expectedTopic,
    analysisLatencyMs,
    analysisError: null,
    analysis,
    sanityChecks: {
      topicMatch:
        analysis.topic.toLowerCase().includes(question.expectedTopic.toLowerCase()) ||
        question.expectedTopic.toLowerCase().includes(analysis.topic.toLowerCase()),
      breakdownSteps: analysis.breakdown.length,
      minBreakdownSteps: question.minBreakdownSteps,
      breakdownMeetsMinimum: analysis.breakdown.length >= question.minBreakdownSteps,
    },
    probeLatencyMs,
    probePairs,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const quiet = args.includes("--quiet") || jsonOutput;
  const providerMode = process.env.AI_MOCK_MODE === "false" ? "live" : "mock";
  const modelId = providerMode === "mock"
    ? "fixed-mock-provider"
    : process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

  if (!quiet) {
    console.log(`Prompt evaluation: ${TEST_QUESTIONS.length} authored examples`);
    console.log(`Provider: ${providerMode} (${modelId})`);
  }

  const results: EvalResult[] = [];
  for (const question of TEST_QUESTIONS) {
    if (!quiet) process.stdout.write(`Evaluating ${question.id}... `);
    const result = await evaluateQuestion(question);
    results.push(result);
    if (!quiet) {
      if (result.analysisError) {
        console.log(`analysis failed (${result.analysisLatencyMs}ms): ${result.analysisError}`);
      } else {
        const generated = result.probePairs.filter((pair) => pair.pair !== null).length;
        const failed = result.probePairs.filter((pair) => pair.error !== null).length;
        console.log(
          `${generated}/${result.probePairs.length} pairs retained, ${failed} follow-up failures`,
        );
      }
    }
  }

  const successfulAnalyses = results.filter((result) => result.analysis !== null);
  const plannedPairs = successfulAnalyses.reduce(
    (count, result) => count + (result.analysis?.probePlan.length ?? 0),
    0,
  );
  const retainedPairs = results.reduce(
    (count, result) => count + result.probePairs.filter((pair) => pair.pair !== null).length,
    0,
  );
  const followUpCalls = results.reduce(
    (count, result) => count + result.probePairs.filter((pair) => pair.source === "follow-up-call").length,
    0,
  );
  const report = {
    metadata: {
      runAt: new Date().toISOString(),
      providerMode,
      modelId,
      promptVersion: "analysis-v2",
      testSetSize: TEST_QUESTIONS.length,
      measurementLimit: "Generated math, distractors, hints, explanations, and concept alignment are not graded automatically.",
    },
    summary: {
      questions: results.length,
      analysisSuccesses: successfulAnalyses.length,
      analysisFailures: results.length - successfulAnalyses.length,
      plannedProbePairs: plannedPairs,
      retainedProbePairs: retainedPairs,
      followUpCalls,
      followUpCallFailures: results.reduce(
        (count, result) => count + result.probePairs.filter((pair) => pair.error !== null).length,
        0,
      ),
      averageAnalysisLatencyMs: successfulAnalyses.length === 0
        ? null
        : Math.round(
            successfulAnalyses.reduce((total, result) => total + result.analysisLatencyMs, 0) /
              successfulAnalyses.length,
          ),
      averageFollowUpProbeLatencyMs: followUpCalls === 0
        ? null
        : Math.round(
            results.reduce((total, result) => total + result.probeLatencyMs, 0) / followUpCalls,
          ),
      topicMatches: successfulAnalyses.filter((result) => result.sanityChecks?.topicMatch).length,
      breakdownsMeetingMinimum: successfulAnalyses.filter(
        (result) => result.sanityChecks?.breakdownMeetsMinimum,
      ).length,
    },
    results,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("\nSummary");
  console.log(`  Questions: ${report.summary.questions}`);
  console.log(`  Successful analyses: ${report.summary.analysisSuccesses}`);
  console.log(`  Probe pairs retained: ${report.summary.retainedProbePairs}/${report.summary.plannedProbePairs}`);
  console.log(`  Follow-up call failures: ${report.summary.followUpCallFailures}`);
  console.log("  Topic and step-count measures are sanity checks only.");
  console.log("  No generated-question accuracy score is calculated.");
  if (providerMode === "mock") {
    console.log("  Mock fixtures verify plumbing only; they are not model evidence.");
  }
}

main().catch((error: unknown) => {
  console.error("Prompt evaluation failed:", errorMessage(error));
  process.exitCode = 1;
});
