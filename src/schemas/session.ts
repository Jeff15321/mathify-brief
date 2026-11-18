import { z } from 'zod';
import { MAX_TUTOR_NOTES_LENGTH } from '@/lib/constants';

/** Today's date (`YYYY-MM-DD`) in the server's local time zone. */
export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const sessionDateSchema = z.iso
  .date({ error: 'sessionDate must be a valid YYYY-MM-DD date' })
  .refine((date) => date <= localToday(), 'sessionDate cannot be in the future');

export const tutorNotesSchema = z.string().trim().max(MAX_TUTOR_NOTES_LENGTH, `tutorNotes must be at most ${MAX_TUTOR_NOTES_LENGTH} characters`);

export const sessionUpdateSchema = z.object({
  sessionDate: sessionDateSchema.optional(),
  tutorNotes: tutorNotesSchema.optional(),
});

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
