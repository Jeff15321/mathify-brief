import { z } from 'zod';

export const feedbackReportIdSchema = z.string().regex(/^[a-f0-9]{64}$/);
const ratingSchema = z.number().int().min(1).max(5);
export const tutorFeedbackSchema = z.object({
  reportId: feedbackReportIdSchema,
  accuracy: ratingSchema,
  clarity: ratingSchema,
  startingPointUsefulness: ratingSchema,
  comments: z.string().trim().max(2000).default(''),
}).strict();

export type TutorFeedbackInput = z.infer<typeof tutorFeedbackSchema>;
