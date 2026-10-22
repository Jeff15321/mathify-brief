import { describe, expect, it } from "vitest";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import {
  modelAnalysisSchema,
  modelProbePairSchema,
  validateAnalysisStructure,
  validateProbePair,
} from "@/schemas/analysis";

describe("Stage 0: mock AI provider produces schema-valid output", () => {
  it("analysis passes Zod validation and structural checks without calling Anthropic", async () => {
    const provider = new MockAnalysisProvider();
    const result = await provider.analyzeQuestion({
      grade: 9,
      questionText: "Solve 2(x + 3) = 14.",
      files: [],
    });

    const parsed = modelAnalysisSchema.parse(result);
    expect(validateAnalysisStructure(parsed)).toEqual([]);
    expect(parsed.probePlan.length).toBeGreaterThanOrEqual(3);
    expect(parsed.probePlan.length).toBeLessThanOrEqual(5);
  });

  it("every planned step has a valid main + easier probe pair", async () => {
    const provider = new MockAnalysisProvider();
    const analysis = await provider.analyzeQuestion({ grade: 9, questionText: "x", files: [] });

    for (let stepIndex = 0; stepIndex < analysis.probePlan.length; stepIndex++) {
      const pair = modelProbePairSchema.parse(
        await provider.generateProbePair({
          grade: 9,
          parsedQuestionMarkdown: analysis.parsedQuestionMarkdown,
          plan: analysis.probePlan,
          stepIndex,
        }),
      );
      expect(validateProbePair(pair)).toEqual([]);
      expect(pair.easier.concept).toBe(pair.main.concept);
    }
  });
});
