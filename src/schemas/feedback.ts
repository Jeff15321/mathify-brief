import { z } from 'zod';

export const FEEDBACK_REASONS = [
  'wrong_starting_point',
  'questions_too_easy',
  'questions_too_hard',
  'missing_context',
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = {
  wrong_starting_point: 'Wrong starting point',
  questions_too_easy: 'Questions too easy',
  questions_too_hard: 'Questions too hard',
  missing_context: 'Missing context',
};

export const feedbackReportIdSchema = z.string().regex(/^[a-f0-9]{64}$/);
const ratingSchema = z.number().int().min(1).max(5);
export const feedbackReasonSchema = z.enum(FEEDBACK_REASONS);

export const tutorFeedbackSchema = z.object({
  reportId: feedbackReportIdSchema,
  accuracy: ratingSchema,
  clarity: ratingSchema.optional(),
  startingPointUsefulness: ratingSchema.optional(),
  reasons: z.array(feedbackReasonSchema).max(FEEDBACK_REASONS.length).optional(),
  comments: z.string().trim().max(2000).default(''),
}).strict();

export type TutorFeedbackInput = z.infer<typeof tutorFeedbackSchema>;
