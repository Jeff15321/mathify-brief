import type { ModelProbe } from "../src/schemas/analysis";
import { MockAnalysisProvider } from "../src/server/ai/mock-provider";
import type {
  PrivateProbe,
  ProbeStep,
  QuestionAnalysisStored,
  ValidationIssue,
  ValidationIssueCategory,
} from "../src/types/domain";

export const BENCHMARK_QUESTION = "Solve 2(x + 3) = 14.";

export interface ValidatorBenchmarkCase {
  id: string;
  scope: "breakdown" | "probes";
  description: string;
  expectedCategories: ValidationIssueCategory[];
  analysis: QuestionAnalysisStored;
  steps: ProbeStep[];
}

export interface ValidatorBenchmarkCallResult {
  id: string;
  scope: ValidatorBenchmarkCase["scope"];
  expectedCategories: ValidationIssueCategory[];
  issues: ValidationIssue[];
  latencyMs: number;
  error: string | null;
}

function toPrivateProbe(probe: ModelProbe, id: string): PrivateProbe {
  return {
    ...probe,
    id,
    options: probe.options.map((option) => ({ ...option })),
  };
}

function cloneProbe(probe: PrivateProbe | null): PrivateProbe | null {
  return probe
    ? { ...probe, options: probe.options.map((option) => ({ ...option })) }
    : null;
}

export async function createValidatorBenchmarkCases(): Promise<ValidatorBenchmarkCase[]> {
  const provider = new MockAnalysisProvider();
  const modelAnalysis = await provider.analyzeQuestion({
    grade: 9,
    questionText: BENCHMARK_QUESTION,
    files: [],
  });
  const analysis: QuestionAnalysisStored = {
    parsedQuestionMarkdown: modelAnalysis.parsedQuestionMarkdown,
    topic: modelAnalysis.topic,
    estimatedQuestionGrade: modelAnalysis.estimatedQuestionGrade,
    gradeDifficulty: modelAnalysis.gradeDifficulty,
    breakdown: modelAnalysis.breakdown.map((step) => ({ ...step })),
    probePlan: modelAnalysis.probePlan.map((step) => ({ ...step })),
    generatedAt: "fixture",
    model: "developer-authored-fixture",
    promptVersion: "analysis-v2",
    analysisVersion: 1,
  };
  const steps: ProbeStep[] = [];

  for (const [stepIndex, plan] of modelAnalysis.probePlan.entries()) {
    const pair = stepIndex === 0
      ? modelAnalysis.firstPair
      : await provider.generateProbePair({
          grade: 9,
          parsedQuestionMarkdown: modelAnalysis.parsedQuestionMarkdown,
          plan: modelAnalysis.probePlan,
          stepIndex,
        });

    steps.push({
      index: stepIndex,
      concept: plan.concept,
      status: "ready",
      generationStartedAt: null,
      main: toPrivateProbe(pair.main, `step-${stepIndex + 1}-main`),
      easier: toPrivateProbe(pair.easier, `step-${stepIndex + 1}-easier`),
      mainAnswer: null,
      easierAnswer: null,
      easierServed: false,
      mainShownAt: null,
      mainAnsweredAt: null,
      easierShownAt: null,
      easierAnsweredAt: null,
    });
  }

  const cloneAnalysis = (): QuestionAnalysisStored => ({
    ...analysis,
    breakdown: analysis.breakdown.map((step) => ({ ...step })),
    probePlan: analysis.probePlan.map((step) => ({ ...step })),
  });
  const cloneSteps = (): ProbeStep[] =>
    steps.map((step) => ({
      ...step,
      main: cloneProbe(step.main),
      easier: cloneProbe(step.easier),
    }));
  const makeCase = (
    id: string,
    scope: ValidatorBenchmarkCase["scope"],
    expectedCategories: ValidationIssueCategory[],
    description: string,
    mutate?: (analysis: QuestionAnalysisStored, steps: ProbeStep[]) => void,
  ): ValidatorBenchmarkCase => {
    const caseAnalysis = cloneAnalysis();
    const caseSteps = cloneSteps();
    mutate?.(caseAnalysis, caseSteps);
    return { id, scope, description, expectedCategories, analysis: caseAnalysis, steps: caseSteps };
  };

  return [
    makeCase(
      "breakdown-control",
      "breakdown",
      [],
      "Unmodified developer-authored breakdown fixture.",
    ),
    makeCase(
      "breakdown-missing-prerequisite",
      "breakdown",
      ["missing_prerequisite"],
      "Removes the distributive-property prerequisite from both lists.",
      (caseAnalysis) => {
        caseAnalysis.breakdown = caseAnalysis.breakdown.filter(
          (step) => step.title !== "Distributive property",
        );
        caseAnalysis.probePlan = caseAnalysis.probePlan.filter(
          (step) => step.concept !== "Distributive property",
        );
      },
    ),
    makeCase(
      "breakdown-unnecessary-prerequisite",
      "breakdown",
      ["unnecessary_prerequisite"],
      "Adds an unrelated Pythagorean-theorem prerequisite.",
      (caseAnalysis) => {
        caseAnalysis.breakdown.push({
          title: "Pythagorean theorem",
          description: "Use the relationship between the legs and hypotenuse of a right triangle.",
        });
        caseAnalysis.probePlan.push({
          concept: "Pythagorean theorem",
          intent: "Check use of the right-triangle side relationship.",
        });
      },
    ),
    makeCase(
      "probes-control",
      "probes",
      [],
      "Unmodified developer-authored probe fixture.",
    ),
    makeCase(
      "probe-wrong-answer-key",
      "probes",
      ["answer_key"],
      "Changes the main probe key to an incorrect option.",
      (_caseAnalysis, caseSteps) => {
        const step = caseSteps[0];
        if (!step?.main) throw new Error("Benchmark fixture is missing its first main probe.");
        step.main = { ...step.main, correctOptionId: "A" };
      },
    ),
    makeCase(
      "probe-ambiguous-options",
      "probes",
      ["ambiguous_options"],
      "Makes a distractor identical to the correct option.",
      (_caseAnalysis, caseSteps) => {
        const step = caseSteps[0];
        if (!step?.main) throw new Error("Benchmark fixture is missing its first main probe.");
        const correctText = step.main.options.find(
          (option) => option.id === step.main?.correctOptionId,
        )?.textMarkdown;
        if (!correctText) throw new Error("Benchmark fixture is missing its keyed option.");
        step.main = {
          ...step.main,
          options: step.main.options.map((option) =>
            option.id === "A" ? { ...option, textMarkdown: correctText } : option,
          ),
        };
      },
    ),
    makeCase(
      "probe-concept-mismatch",
      "probes",
      ["concept_mismatch"],
      "Changes the easier probe concept to an unrelated theorem.",
      (_caseAnalysis, caseSteps) => {
        const step = caseSteps[0];
        if (!step?.easier) throw new Error("Benchmark fixture is missing its first easier probe.");
        step.easier = { ...step.easier, concept: "Pythagorean theorem" };
      },
    ),
    makeCase(
      "probe-explanation-error",
      "probes",
      ["explanation_error"],
      "Changes the explanation to an incorrect distribution rule.",
      (_caseAnalysis, caseSteps) => {
        const step = caseSteps[0];
        if (!step?.main) throw new Error("Benchmark fixture is missing its first main probe.");
        step.main = { ...step.main, explanation: "Only multiply x by 2 and leave 3 unchanged." };
      },
    ),
    makeCase(
      "probe-hint-leak",
      "probes",
      ["hint_leak"],
      "Reveals the marked answer in the main-probe hint.",
      (_caseAnalysis, caseSteps) => {
        const step = caseSteps[0];
        if (!step?.main) throw new Error("Benchmark fixture is missing its first main probe.");
        step.main = { ...step.main, hint: "The answer is $2x + 6$." };
      },
    ),
    makeCase(
      "probe-easier-not-simpler",
      "probes",
      ["difficulty_mismatch"],
      "Replaces the easier item with a more complex expression on the same concept.",
      (_caseAnalysis, caseSteps) => {
        const step = caseSteps[0];
        if (!step?.easier) throw new Error("Benchmark fixture is missing its first easier probe.");
        step.easier = {
          ...step.easier,
          questionMarkdown: "Expand $7(4x + 13)$.",
          options: [
            { id: "A", textMarkdown: "$28x + 91$" },
            { id: "B", textMarkdown: "$28x + 13$" },
            { id: "C", textMarkdown: "$11x + 91$" },
            { id: "D", textMarkdown: "$28x + 20$" },
          ],
          correctOptionId: "A",
          explanation: "Multiply 7 by both 4x and 13 to get 28x + 91.",
          hint: "Multiply 7 by each term inside the brackets.",
        };
      },
    ),
  ];
}

function detectsCategory(result: ValidatorBenchmarkCallResult, category: ValidationIssueCategory): boolean {
  return result.error === null && result.issues.some((issue) => issue.category === category);
}

export function summarizeValidatorBenchmark(results: ValidatorBenchmarkCallResult[]) {
  const seededFaults = results.filter((result) => result.expectedCategories.length > 0);
  const cleanControls = results.filter((result) => result.expectedCategories.length === 0);
  const completedCleanControls = cleanControls.filter((result) => result.error === null);
  const flaggedCleanControls = completedCleanControls.filter((result) => result.issues.length > 0).length;
  const detectedFaults = seededFaults.filter((result) =>
    result.expectedCategories.every((category) => detectsCategory(result, category)),
  ).length;
  const unclassifiedIssues = results.reduce(
    (count, result) => count + result.issues.filter((issue) => !issue.category).length,
    0,
  );
  const unexpectedCategoryIssues = results.reduce(
    (count, result) =>
      count +
      result.issues.filter(
        (issue) => issue.category !== undefined && !result.expectedCategories.includes(issue.category),
      ).length,
    0,
  );
  const categorySummary = (category: ValidationIssueCategory) => {
    const cases = seededFaults.filter((result) => result.expectedCategories.includes(category));
    const detected = cases.filter((result) => detectsCategory(result, category)).length;
    return { seeded: cases.length, detected, missed: cases.length - detected };
  };

  return {
    totalCases: results.length,
    completedCalls: results.filter((result) => result.error === null).length,
    failedCalls: results.filter((result) => result.error !== null).length,
    seededFaults: seededFaults.length,
    seededFaultsDetected: detectedFaults,
    seededFaultsMissed: seededFaults.length - detectedFaults,
    seededFaultDetectionRate: seededFaults.length === 0 ? null : detectedFaults / seededFaults.length,
    cleanControls: cleanControls.length,
    completedCleanControls: completedCleanControls.length,
    flaggedCleanControls,
    cleanFalseAlarmRate:
      completedCleanControls.length === 0 ? null : flaggedCleanControls / completedCleanControls.length,
    unclassifiedIssues,
    unexpectedCategoryIssues,
    faultsByCategory: {
      missing_prerequisite: categorySummary("missing_prerequisite"),
      unnecessary_prerequisite: categorySummary("unnecessary_prerequisite"),
      answer_key: categorySummary("answer_key"),
      ambiguous_options: categorySummary("ambiguous_options"),
      concept_mismatch: categorySummary("concept_mismatch"),
      explanation_error: categorySummary("explanation_error"),
      hint_leak: categorySummary("hint_leak"),
      difficulty_mismatch: categorySummary("difficulty_mismatch"),
      other: categorySummary("other"),
    },
  };
}
