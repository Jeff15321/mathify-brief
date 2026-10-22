import type { ModelAnalysis, ModelProbePair } from '@/schemas/analysis';
import type { ModelBrief } from '@/schemas/brief';
import type { MimeType, ProbePlanItem, ProbeResult, QuestionAnalysisStored } from '@/types/domain';

export interface StoredFile {
  fileName: string;
  mimeType: MimeType;
  bytes: Buffer;
}

export interface AnalyzeQuestionInput {
  grade: number;
  questionText: string;
  files: StoredFile[];
}

/** Input for one step's main + easier probes. Deliberately excludes student answers: steps are independent. */
export interface GenerateProbePairInput {
  grade: number;
  parsedQuestionMarkdown: string;
  plan: ProbePlanItem[];
  stepIndex: number;
}

/**
 * Input for an AI-written brief that also reads the final whiteboard. Not called yet: the Tutor Brief
 * is deterministic today, and this will be adapted to complement it once whiteboard analysis lands.
 */
export interface GenerateTutorBriefInput {
  grade: number;
  questionText: string;
  files: StoredFile[];
  analysis: QuestionAnalysisStored;
  results: ProbeResult[];
  notReachedConcepts: string[];
  whiteboardPng: Buffer | null;
}

export interface MathAnalysisProvider {
  analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis>;
  generateProbePair(input: GenerateProbePairInput): Promise<ModelProbePair>;
  generateTutorBrief(input: GenerateTutorBriefInput): Promise<ModelBrief>;
}
