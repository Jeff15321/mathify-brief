import type { ModelAnalysis, ModelProbePair } from '@/schemas/analysis';
import type { AnalysisReview, ProbeReview } from '@/schemas/review';
import type { ModelBrief, ModelHistory } from '@/schemas/brief';
import type { ModelSessionSummary } from '@/schemas/session';
import type { ModelLearnerProfile } from '@/schemas/profile';
import type { LearnerProfile, LearnerProfileItem, MimeType, ProbePlanItem, ProbeResult, QuestionAnalysisStored, SessionObservation } from '@/types/domain';

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

export interface SummarizeSessionInput {
  grade: number;
  sessionDate: string;
  transcriptText: string;
  tutorNotes: string;
  whiteboards: StoredFile[];
}

/** Every `ready` session, oldest first, plus the current profile as read-only context. */
export interface BuildLearnerProfileInput {
  grade: number;
  currentItems: Pick<LearnerProfileItem, 'source' | 'category' | 'text' | 'status'>[];
  tutorNotes: string;
  /** The tutor's own next focus, '' when the AI owns it. */
  tutorNextFocus: string;
  /** AI items the tutor deleted; never return them again. */
  dismissedItems: LearnerProfile['dismissed'];
  sessions: { sessionId: string; date: string; title: string | null; observations: SessionObservation[] }[];
}

/** The deterministic brief of the current question plus the learner profile, for `history-v1`. */
export interface RelevantHistoryInput {
  grade: number;
  parsedQuestionMarkdown: string;
  topic: string;
  results: ProbeResult[];
  notReachedConcepts: string[];
  profile: {
    items: Pick<LearnerProfileItem, 'category' | 'text' | 'status' | 'evidence'>[];
    nextFocus: string;
    tutorNotes: string;
  };
}

export interface MathAnalysisProvider {
  reviewAnalysis(input: AnalyzeQuestionInput, candidate: ModelAnalysis): Promise<AnalysisReview>;
  reviewProbePair(input: GenerateProbePairInput, candidate: ModelProbePair): Promise<ProbeReview>;
  analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis>;
  generateProbePair(input: GenerateProbePairInput): Promise<ModelProbePair>;
  generateTutorBrief(input: GenerateTutorBriefInput): Promise<ModelBrief>;
  summarizeSession(input: SummarizeSessionInput): Promise<ModelSessionSummary>;
  buildLearnerProfile(input: BuildLearnerProfileInput): Promise<ModelLearnerProfile>;
  relevantHistory(input: RelevantHistoryInput): Promise<ModelHistory>;
}
