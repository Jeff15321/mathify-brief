import type { ModelAnalysis } from '@/schemas/analysis';

export interface AnalyzeQuestionInput {
  grade: number;
  questionText: string;
  files: { fileName: string; mimeType: string; bytes: Buffer }[];
}

export interface MathAnalysisProvider {
  analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis>;
}
