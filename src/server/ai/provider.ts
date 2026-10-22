import type { ModelAnalysis, ModelProbePair } from '@/schemas/analysis';
import type { MimeType, ProbePlanItem } from '@/types/domain';

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

export interface MathAnalysisProvider {
  analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis>;
  generateProbePair(input: GenerateProbePairInput): Promise<ModelProbePair>;
}
