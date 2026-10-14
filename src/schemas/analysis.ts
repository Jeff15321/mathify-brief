import { z } from 'zod';

export const optionIdSchema = z.enum(['A', 'B', 'C', 'D']);

export const probeOptionSchema = z.object({
  id: optionIdSchema,
  textMarkdown: z.string().min(1),
});

export const modelProbeSchema = z.object({
  concept: z.string().min(1),
  questionMarkdown: z.string().min(1),
  options: z.array(probeOptionSchema),
  correctOptionId: optionIdSchema,
  explanation: z.string().min(1),
});

export const breakdownStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const gradeDifficultySchema = z.enum([
  'below_grade',
  'on_grade',
  'stretch',
  'uncertain',
]);

export const modelAnalysisSchema = z.object({
  parsedQuestionMarkdown: z.string().min(1),
  topic: z.string().min(1),
  gradeDifficulty: gradeDifficultySchema,
  breakdown: z.array(breakdownStepSchema),
  probingQuestions: z.array(modelProbeSchema),
});

export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;

/**
 * Additional code-level checks beyond Zod shape validation (IMPLEMENTATION_PLAN.md
 * Section 6.1): 3-5 probes, exactly four unique option ids A-D per probe, correct id present.
 */
export function validateAnalysisStructure(analysis: ModelAnalysis): string[] {
  const errors: string[] = [];

  if (analysis.probingQuestions.length < 3 || analysis.probingQuestions.length > 5) {
    errors.push('probingQuestions must contain between 3 and 5 questions');
  }

  if (analysis.breakdown.length < 2 || analysis.breakdown.length > 6) {
    errors.push('breakdown must contain between 2 and 6 steps');
  }

  const allOptionIds = ['A', 'B', 'C', 'D'] as const;

  analysis.probingQuestions.forEach((probe, index) => {
    const ids = probe.options.map((option) => option.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== 4 || !allOptionIds.every((id) => uniqueIds.has(id))) {
      errors.push(`probingQuestions[${index}] must have exactly four unique options A-D`);
    }
    if (!ids.includes(probe.correctOptionId)) {
      errors.push(`probingQuestions[${index}].correctOptionId must match one of its options`);
    }
  });

  return errors;
}
