import { z } from 'zod';

/** Server-only verdicts. Missing, uncertain or malformed judgments never approve content. */
export const probeReviewSchema = z.object({
  answerKeysCorrect: z.boolean(),
  exactlyOneCorrectOption: z.boolean(),
  explanationsCorrect: z.boolean(),
  prerequisiteRelevant: z.boolean(),
  sameConcept: z.boolean(),
  easierIsSimpler: z.boolean(),
  studentSafe: z.boolean(),
});
export const analysisReviewSchema = probeReviewSchema.extend({
  faithfulToOriginal: z.boolean(),
  breakdownMathematicallyCorrect: z.boolean(),
  breakdownPedagogicallySound: z.boolean(),
  planRelevantAndDistinct: z.boolean(),
});
export type ProbeReview = z.infer<typeof probeReviewSchema>;
export type AnalysisReview = z.infer<typeof analysisReviewSchema>;

export function reviewApproved(verdict: ProbeReview | AnalysisReview): boolean {
  return Object.values(verdict).every((value) => value === true);
}
