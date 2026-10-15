export type AssetKind = 'attachment' | 'whiteboard';
export type MimeType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';

export interface StoredAsset {
  id: string;
  kind: AssetKind;
  fileName: string;
  mimeType: MimeType;
  sizeBytes: number;
  createdAt: string;
}

export interface DemoProfile {
  displayName: 'Demo Student';
  grade: 9;
}

export const DEMO_PROFILE: DemoProfile = { displayName: 'Demo Student', grade: 9 };

export type GradeDifficulty = 'below_grade' | 'on_grade' | 'stretch' | 'uncertain';

export interface StudentBreakdownStep {
  title: string;
  description: string;
}

export interface QuestionAnalysisPublic {
  parsedQuestionMarkdown: string;
  topic: string;
  estimatedQuestionGrade: string;
  gradeDifficulty: GradeDifficulty;
  breakdown: StudentBreakdownStep[];
  probingQuestions: PublicProbe[];
}

export interface PublicProbe {
  id: string;
  concept: string;
  questionMarkdown: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; textMarkdown: string }[];
}

export interface PrivateProbe extends PublicProbe {
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface QuestionAnalysisStored {
  parsedQuestionMarkdown: string;
  topic: string;
  estimatedQuestionGrade: string;
  gradeDifficulty: GradeDifficulty;
  breakdown: StudentBreakdownStep[];
  probingQuestions: PrivateProbe[];
  generatedAt: string;
  model: string;
  promptVersion: 'analysis-v1';
  analysisVersion: 1;
}

export type ProbeAnswers = Record<string, 'A' | 'B' | 'C' | 'D'>;

export interface ProbeResult {
  probeId: string;
  concept: string;
  questionMarkdown: string;
  selectedOptionId: 'A' | 'B' | 'C' | 'D' | null;
  selectedOptionText: string | null;
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  correctOptionText: string;
  isCorrect: boolean | null;
  explanation: string;
}

export interface TutorBrief {
  summary: string;
  gradeAssessment: string;
  strengths: { observation: string; evidence: string }[];
  possibleGaps: { observation: string; evidence: string }[];
  whiteboardObservations: string[];
  suggestedStartingPoint: string;
  limitations: string[];
  results: ProbeResult[];
  answeredCount: number;
  correctCount: number;
  unansweredCount: number;
  generatedAt: string;
  model: string;
  promptVersion: 'brief-v1';
}

export type WorkspacePhase = 'intake' | 'ready' | 'complete';

export interface CurrentWorkspace {
  schemaVersion: 1;
  demoProfile: DemoProfile;
  questionText: string;
  attachments: StoredAsset[];
  createdAt: string;
  updatedAt: string;
  phase: WorkspacePhase;
  analysis: QuestionAnalysisStored | null;
  answers: ProbeAnswers;
  whiteboardAsset: StoredAsset | null;
  brief: TutorBrief | null;
}

export interface PublicWorkspace {
  profile: DemoProfile;
  questionText: string;
  attachments: StoredAsset[];
  phase: WorkspacePhase;
  analysis: QuestionAnalysisPublic | null;
  answers: ProbeAnswers;
  whiteboardAsset: StoredAsset | null;
  brief: TutorBrief | null;
}

export function toPublicProbe(probe: PrivateProbe): PublicProbe {
  return {
    id: probe.id,
    concept: probe.concept,
    questionMarkdown: probe.questionMarkdown,
    options: probe.options,
  };
}

export function toPublicAnalysis(analysis: QuestionAnalysisStored): QuestionAnalysisPublic {
  return {
    parsedQuestionMarkdown: analysis.parsedQuestionMarkdown,
    topic: analysis.topic,
    estimatedQuestionGrade: analysis.estimatedQuestionGrade,
    gradeDifficulty: analysis.gradeDifficulty,
    breakdown: analysis.breakdown,
    probingQuestions: analysis.probingQuestions.map(toPublicProbe),
  };
}

export function toPublicWorkspace(workspace: CurrentWorkspace): PublicWorkspace {
  return {
    profile: workspace.demoProfile,
    questionText: workspace.questionText,
    attachments: workspace.attachments,
    phase: workspace.phase,
    analysis: workspace.analysis ? toPublicAnalysis(workspace.analysis) : null,
    answers: workspace.answers,
    whiteboardAsset: workspace.whiteboardAsset,
    brief: workspace.brief,
  };
}
