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
  hint: z.string().min(1),
});

export type ModelProbe = z.infer<typeof modelProbeSchema>;

/** One generated step: the main probe plus an easier probe on the same concept, served after a wrong/IDK answer. */
export const modelProbePairSchema = z.object({
  main: modelProbeSchema,
  easier: modelProbeSchema,
});

export type ModelProbePair = z.infer<typeof modelProbePairSchema>;

export const probePlanItemSchema = z.object({
  concept: z.string().min(1),
  intent: z.string().min(1),
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
  estimatedQuestionGrade: z.string().min(1),
  gradeDifficulty: gradeDifficultySchema,
  breakdown: z.array(breakdownStepSchema),
  probePlan: z.array(probePlanItemSchema),
  firstPair: modelProbePairSchema,
});

export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;

const ALL_OPTION_IDS = ['A', 'B', 'C', 'D'] as const;

/**
 * Code-level checks for one generated probe beyond Zod shape validation.
 * @param label - Prefix used in error messages, e.g. "firstPair.main".
 * @returns Human-readable errors; empty when the probe is valid.
 */
export function validateProbe(probe: ModelProbe, label: string): string[] {
  const errors: string[] = [];
  const ids = probe.options.map((option) => option.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== 4 || !ALL_OPTION_IDS.every((id) => uniqueIds.has(id))) {
    errors.push(`${label} must have exactly four unique options A-D`);
  }
  if (!ids.includes(probe.correctOptionId)) {
    errors.push(`${label}.correctOptionId must match one of its options`);
  }
  return errors;
}

/** Validates both probes of a generated pair; returns errors, empty when valid. */
export function validateProbePair(pair: ModelProbePair, label = 'pair'): string[] {
  return [...validateProbe(pair.main, `${label}.main`), ...validateProbe(pair.easier, `${label}.easier`)];
}

/**
 * Additional code-level checks for the Stage A analysis: a 3-5 step probe plan,
 * a 2-6 step breakdown, and a valid first probe pair.
 */
export function validateAnalysisStructure(analysis: ModelAnalysis): string[] {
  const errors: string[] = [];

  if (analysis.probePlan.length < 3 || analysis.probePlan.length > 5) {
    errors.push('probePlan must contain between 3 and 5 steps');
  }

  if (analysis.breakdown.length < 2 || analysis.breakdown.length > 6) {
    errors.push('breakdown must contain between 2 and 6 steps');
  }

  errors.push(...validateProbePair(analysis.firstPair, 'firstPair'));

  return errors;
}
