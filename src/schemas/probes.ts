import { z } from 'zod';
import { OPTION_IDS } from '@/contracts/probes';

export const optionIdSchema = z.enum(OPTION_IDS);
export const probeAnswerSchema = z.union([optionIdSchema, z.literal('IDK')]);

export const answerRequestSchema = z.object({
  probeId: z.string().min(1),
  answer: probeAnswerSchema,
  hintOpened: z.boolean().optional(),
  durationMs: z.number().int().nonnegative().max(3_600_000).optional(),
});

// Submitting a brief can record an opened hint without selecting an answer.
export const pendingAnswerSchema = answerRequestSchema.extend({ answer: probeAnswerSchema.nullable() });

export type AnswerRequest = z.infer<typeof answerRequestSchema>;
export type PendingAnswer = z.infer<typeof pendingAnswerSchema>;
