import { z } from 'zod';
import { breakdownStepSchema, gradeDifficultySchema, optionIdSchema, probeOptionSchema } from './analysis';

export const assetKindSchema = z.enum(['attachment', 'whiteboard']);
export const mimeTypeSchema = z.enum(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

export const storedAssetSchema = z.object({
  id: z.string().min(1),
  kind: assetKindSchema,
  fileName: z.string().min(1),
  mimeType: mimeTypeSchema,
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
});

export const demoProfileSchema = z.object({
  displayName: z.literal('Demo Student'),
  grade: z.literal(9),
});

export const privateProbeSchema = z.object({
  id: z.string().min(1),
  concept: z.string().min(1),
  questionMarkdown: z.string().min(1),
  options: z.array(probeOptionSchema),
  correctOptionId: optionIdSchema,
  explanation: z.string().min(1),
});

export const analysisStoredSchema = z.object({
  parsedQuestionMarkdown: z.string().min(1),
  topic: z.string().min(1),
  estimatedQuestionGrade: z.string().min(1),
  gradeDifficulty: gradeDifficultySchema,
  breakdown: z.array(breakdownStepSchema),
  probingQuestions: z.array(privateProbeSchema),
  generatedAt: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.literal('analysis-v1'),
  analysisVersion: z.literal(1),
});

export const probeAnswersSchema = z.record(z.string(), optionIdSchema);

export const probeResultSchema = z.object({
  probeId: z.string().min(1),
  concept: z.string().min(1),
  questionMarkdown: z.string().min(1),
  selectedOptionId: optionIdSchema.nullable(),
  selectedOptionText: z.string().nullable(),
  correctOptionId: optionIdSchema,
  correctOptionText: z.string().min(1),
  isCorrect: z.boolean().nullable(),
  explanation: z.string().min(1),
});

export const tutorBriefSchema = z.object({
  summary: z.string().min(1),
  gradeAssessment: z.string().min(1),
  strengths: z.array(z.object({ observation: z.string().min(1), evidence: z.string().min(1) })),
  possibleGaps: z.array(z.object({ observation: z.string().min(1), evidence: z.string().min(1) })),
  whiteboardObservations: z.array(z.string()),
  suggestedStartingPoint: z.string().min(1),
  limitations: z.array(z.string()),
  results: z.array(probeResultSchema),
  answeredCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  unansweredCount: z.number().int().nonnegative(),
  generatedAt: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.literal('brief-v1'),
});

export const workspacePhaseSchema = z.enum(['intake', 'ready', 'complete']);

export const currentWorkspaceSchema = z.object({
  schemaVersion: z.literal(1),
  demoProfile: demoProfileSchema,
  questionText: z.string(),
  attachments: z.array(storedAssetSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  phase: workspacePhaseSchema,
  analysis: analysisStoredSchema.nullable(),
  answers: probeAnswersSchema,
  whiteboardAsset: storedAssetSchema.nullable(),
  brief: tutorBriefSchema.nullable(),
});
