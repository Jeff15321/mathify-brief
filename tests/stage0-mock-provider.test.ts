import { describe, expect, it } from "vitest";
import { MockAnalysisProvider } from "@/server/ai/mock-provider";
import { modelAnalysisSchema, validateAnalysisStructure } from "@/schemas/analysis";

describe("Stage 0: mock AI provider produces schema-valid output", () => {
  it("passes Zod validation and structural checks without calling Anthropic", async () => {
    const provider = new MockAnalysisProvider();
    const result = await provider.analyzeQuestion({
      grade: 9,
      questionText: "Solve 2(x + 3) = 14.",
      files: [],
    });

    const parsed = modelAnalysisSchema.parse(result);
    const structuralErrors = validateAnalysisStructure(parsed);

    expect(structuralErrors).toEqual([]);
    expect(parsed.probingQuestions.length).toBeGreaterThanOrEqual(3);
    expect(parsed.probingQuestions.length).toBeLessThanOrEqual(5);
  });
});
