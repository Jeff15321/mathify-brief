import { z } from 'zod';

export const observationCategorySchema = z.enum(['struggle', 'strength', 'what_works', 'habit']);

export const sessionObservationSchema = z.object({
  category: observationCategorySchema,
  text: z.string().min(1),
  quote: z.string().min(1).optional(),
});

/** One session's AI summary. The 2-4 sentence summary length is a prompt rule, not validated here. */
export const modelSessionSummarySchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1),
  observations: z.array(sessionObservationSchema).max(8),
});

export type ModelSessionSummary = z.infer<typeof modelSessionSummarySchema>;
