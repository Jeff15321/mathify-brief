import type { ModelAnalysis } from '@/schemas/analysis';
import type { MimeType } from '@/types/domain';

export interface AnalyzeQuestionInput {
  grade: number;
  questionText: string;
  files: { fileName: string; mimeType: MimeType; bytes: Buffer }[];
}

export interface MathAnalysisProvider {
  analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis>;
}
