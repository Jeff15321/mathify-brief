import { z } from 'zod';
import { MAX_TUTOR_NOTES_LENGTH } from '@/contracts/limits';
import { observationCategorySchema } from './session';

export const MAX_PROFILE_TEXT_LENGTH = 300;

export const profileItemStatusSchema = z.enum(['active', 'improving', 'resolved']);

/** The model's rebuilt profile. The server fills evidence dates from the sessions and assigns ids. */
export const modelLearnerProfileSchema = z.object({
  nextFocus: z.string(),
  items: z.array(z.object({
    category: observationCategorySchema,
    text: z.string().min(1),
    status: profileItemStatusSchema,
    evidence: z.array(z.object({ sessionId: z.string(), quote: z.string().min(1).optional() })),
  })).max(20),
});

export type ModelLearnerProfile = z.infer<typeof modelLearnerProfileSchema>;

const profileTextSchema = (field: string) => z.string().trim().max(MAX_PROFILE_TEXT_LENGTH, `${field} must be at most ${MAX_PROFILE_TEXT_LENGTH} characters`);

/** Tutor edits. Upserted items always become `source: 'tutor'`; `source` and `evidence` are ignored. */
export const profileUpdateSchema = z.object({
  nextFocus: profileTextSchema('nextFocus').optional(),
  tutorNotes: z.string().trim().max(MAX_TUTOR_NOTES_LENGTH, `tutorNotes must be at most ${MAX_TUTOR_NOTES_LENGTH} characters`).optional(),
  upsertItems: z.array(z.object({
    id: z.uuid().optional(),
    category: observationCategorySchema,
    text: profileTextSchema('Item text').min(1, 'Item text is required'),
    status: profileItemStatusSchema,
  })).max(20).optional(),
  deleteItemIds: z.array(z.uuid()).max(100).optional(),
});

export type ProfileUpdate = z.input<typeof profileUpdateSchema>;
