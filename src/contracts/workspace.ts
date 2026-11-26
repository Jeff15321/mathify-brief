import type { PublicProbing } from './probes';
import type { StoredAsset } from './assets';
import type { TutorBrief } from './brief';
import type { DemoProfile } from './profile';

export type GradeDifficulty = 'below_grade' | 'on_grade' | 'stretch' | 'uncertain';

export interface StudentBreakdownStep {
  title: string;
  description: string;
}

export interface QuestionAnalysisPublic {
  preparationDurationMs?: number;
  concepts?: string[];
  parsedQuestionMarkdown: string;
  topic: string;
  estimatedQuestionGrade: string;
  gradeDifficulty: GradeDifficulty;
  breakdown: StudentBreakdownStep[];
}

export type WorkspacePhase = 'intake' | 'ready' | 'complete';

export interface PublicWorkspace {
  generationMode: 'mock' | 'live';
  promptVersion: string;
  workspaceId: string;
  draftId: string;
  analysisStatus: 'idle' | 'generating' | 'failed' | 'ready';
  whiteboardState: 'none' | 'attached' | 'omitted';
  /** Fingerprint of the exact completed report, computed on the server. */
  feedbackReportId?: string | null;
  profile: DemoProfile;
  questionText: string;
  attachments: StoredAsset[];
  phase: WorkspacePhase;
  analysis: QuestionAnalysisPublic | null;
  probing: PublicProbing | null;
  whiteboardAsset: StoredAsset | null;
  brief: TutorBrief | null;
}
