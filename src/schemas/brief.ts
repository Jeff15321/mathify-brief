import { z } from 'zod';

export const modelBriefSchema = z.object({
  summary: z.string().min(1),
  gradeAssessment: z.string().min(1),
  strengths: z.array(z.object({ observation: z.string().min(1), evidence: z.string().min(1) })),
  possibleGaps: z.array(z.object({ observation: z.string().min(1), evidence: z.string().min(1) })),
  whiteboardObservations: z.array(z.string()),
  suggestedStartingPoint: z.string().min(1),
  limitations: z.array(z.string()),
});

export type ModelBrief = z.infer<typeof modelBriefSchema>;
