import type { ModelAnalysis } from '@/schemas/analysis';
import type { ModelBrief } from '@/schemas/brief';
import type { MimeType, ProbeResult, QuestionAnalysisStored } from '@/types/domain';

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

export interface GenerateTutorBriefInput {
  grade: number;
  questionText: string;
  files: StoredFile[];
  analysis: QuestionAnalysisStored;
  results: ProbeResult[];
  whiteboardPng: Buffer | null;
}

export interface MathAnalysisProvider {
  analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis>;
  generateTutorBrief(input: GenerateTutorBriefInput): Promise<ModelBrief>;
}
