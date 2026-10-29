import { z } from 'zod';
import {
  breakdownStepSchema,
  gradeDifficultySchema,
  optionIdSchema,
  probeOptionSchema,
  probePlanItemSchema,
} from './analysis';

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
  hint: z.string().min(1),
});

export const analysisStoredSchema = z.object({
  parsedQuestionMarkdown: z.string().min(1),
  topic: z.string().min(1),
  estimatedQuestionGrade: z.string().min(1),
  gradeDifficulty: gradeDifficultySchema,
  breakdown: z.array(breakdownStepSchema),
  probePlan: z.array(probePlanItemSchema),
  generatedAt: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.literal('analysis-v2'),
  analysisVersion: z.literal(1),
});

/** One student answer: a generated option A-D, or "I don't know" (never part of the AI's output format). */
export const probeAnswerSchema = z.union([optionIdSchema, z.literal('IDK')]);

export const probeKindSchema = z.enum(['main', 'easier']);

export const probeStepSchema = z.object({
  index: z.number().int().nonnegative(),
  concept: z.string().min(1),
  status: z.enum(['pending', 'generating', 'ready', 'failed']),
  generationStartedAt: z.string().nullable(),
  main: privateProbeSchema.nullable(),
  easier: privateProbeSchema.nullable(),
  mainAnswer: probeAnswerSchema.nullable(),
  easierAnswer: probeAnswerSchema.nullable(),
  easierServed: z.boolean(),
  mainShownAt: z.string().nullable(),
  mainAnsweredAt: z.string().nullable(),
  easierShownAt: z.string().nullable(),
  easierAnsweredAt: z.string().nullable(),
});

export const probeCursorSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  kind: probeKindSchema,
});

export const probeOutcomeSchema = z.enum(['correct', 'incorrect', 'dont_know', 'unanswered']);

export const probeResultSchema = z.object({
  probeId: z.string().min(1),
  stepIndex: z.number().int().nonnegative(),
  kind: probeKindSchema,
  concept: z.string().min(1),
  questionMarkdown: z.string().min(1),
  selectedOptionId: optionIdSchema.nullable(),
  selectedOptionText: z.string().nullable(),
  correctOptionId: optionIdSchema,
  correctOptionText: z.string().min(1),
  isCorrect: z.boolean().nullable(),
  outcome: probeOutcomeSchema,
  explanation: z.string().min(1),
});

export const probeTallySchema = z.object({
  total: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  dontKnow: z.number().int().nonnegative(),
});

export const tutorBriefSchema = z.object({
  results: z.array(probeResultSchema),
  notReachedConcepts: z.array(z.string()),
  core: probeTallySchema,
  retries: probeTallySchema,
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  priorityStepIndex: z.number().int().nonnegative().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  confidenceFactors: z.array(z.object({ factor: z.string(), detail: z.string() })),
  earlyExit: z.boolean(),
  generatedAt: z.string().min(1),
  briefVersion: z.literal(5),
});

export const validationIssueSchema = z.object({
  severity: z.enum(['warning', 'error']),
  message: z.string().min(1),
  probeId: z.string().nullable().optional(),
});

export const validationSchema = z.object({
  status: z.enum(['done', 'partial', 'failed']),
  issues: z.array(validationIssueSchema),
  validatedAt: z.string().min(1),
});

export const workspacePhaseSchema = z.enum(['intake', 'ready', 'complete']);

export const CURRENT_SCHEMA_VERSION = 4;

export const currentWorkspaceSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  demoProfile: demoProfileSchema,
  questionText: z.string(),
  attachments: z.array(storedAssetSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  phase: workspacePhaseSchema,
  analysis: analysisStoredSchema.nullable(),
  probeSteps: z.array(probeStepSchema),
  cursor: probeCursorSchema.nullable(),
  whiteboardAsset: storedAssetSchema.nullable(),
  brief: tutorBriefSchema.nullable(),
  validation: validationSchema.nullable().default(null),
});
