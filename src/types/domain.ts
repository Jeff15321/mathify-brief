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

export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface QuestionAnalysisPublic {
  parsedQuestionMarkdown: string;
  topic: string;
  estimatedQuestionGrade: string;
  gradeDifficulty: GradeDifficulty;
  breakdown: StudentBreakdownStep[];
}

export interface PublicProbe {
  id: string;
  concept: string;
  questionMarkdown: string;
  options: { id: OptionId; textMarkdown: string }[];
}

export interface PrivateProbe extends PublicProbe {
  correctOptionId: OptionId;
  explanation: string;
}

/** One planned prerequisite step; the plan fixes how many main questions the student gets. */
export interface ProbePlanItem {
  concept: string;
  intent: string;
}

export interface QuestionAnalysisStored {
  parsedQuestionMarkdown: string;
  topic: string;
  estimatedQuestionGrade: string;
  gradeDifficulty: GradeDifficulty;
  breakdown: StudentBreakdownStep[];
  probePlan: ProbePlanItem[];
  generatedAt: string;
  model: string;
  promptVersion: 'analysis-v2';
  analysisVersion: 1;
}

/** A student's response to one probe: one of the generated options, or "I don't know". */
export type ProbeAnswer = OptionId | 'IDK';

/** Which probe of a step: the main question, or its easier retry. */
export type ProbeKind = 'main' | 'easier';

/** Generation state of a step's probe pair. */
export type StepStatus = 'pending' | 'generating' | 'ready' | 'failed';

/**
 * One planned step: its generated main/easier probes and the student's answers.
 * `easier` is generated with `main` but only served after a wrong or "I don't know" main answer.
 */
export interface ProbeStep {
  index: number;
  concept: string;
  status: StepStatus;
  generationStartedAt: string | null;
  main: PrivateProbe | null;
  easier: PrivateProbe | null;
  mainAnswer: ProbeAnswer | null;
  easierAnswer: ProbeAnswer | null;
  easierServed: boolean;
}

/** The probe currently in front of the student; null once every step is done. */
export interface ProbeCursor {
  stepIndex: number;
  kind: ProbeKind;
}

/** Deterministic per-probe outcome; "dont_know" is self-reported uncertainty, distinct from wrong or blank. */
export type ProbeOutcome = 'correct' | 'incorrect' | 'dont_know' | 'unanswered';

export interface ProbeResult {
  probeId: string;
  stepIndex: number;
  kind: ProbeKind;
  concept: string;
  questionMarkdown: string;
  selectedOptionId: OptionId | null;
  selectedOptionText: string | null;
  correctOptionId: OptionId;
  correctOptionText: string;
  isCorrect: boolean | null;      // null for "I don't know" and unanswered
  outcome: ProbeOutcome;
  explanation: string;
}

/** Deterministic tally for one kind of probe (core = main questions, retries = easier ones). */
export interface ProbeTally {
  total: number;        // core: planned steps; retries: easier probes served
  attempted: number;    // any answer, "I don't know" included
  correct: number;
  incorrect: number;
  dontKnow: number;
}

/** The Tutor Brief dashboard, computed entirely from stored answers (no AI). */
export interface TutorBrief {
  results: ProbeResult[];         // one per probe actually served
  notReachedConcepts: string[];   // planned steps the student never reached before submitting
  core: ProbeTally;
  retries: ProbeTally;
  strengths: string[];            // concept names; "(easier)" when only the retry was correct
  gaps: string[];                 // concepts missed on the main probe and not recovered on retry
  priorityStepIndex: number | null; // first step whose main answer was incorrect or "I don't know"
  generatedAt: string;
  briefVersion: 4;
}

export type WorkspacePhase = 'intake' | 'ready' | 'complete';

export interface CurrentWorkspace {
  schemaVersion: 3;
  demoProfile: DemoProfile;
  questionText: string;
  attachments: StoredAsset[];
  createdAt: string;
  updatedAt: string;
  phase: WorkspacePhase;
  analysis: QuestionAnalysisStored | null;
  probeSteps: ProbeStep[];
  cursor: ProbeCursor | null;
  whiteboardAsset: StoredAsset | null;
  brief: TutorBrief | null;
}

/** Student-safe view of the one-question-at-a-time flow. Never contains answer keys or unserved probes. */
export interface PublicProbing {
  revision: string;               // workspace updatedAt; lets the client ignore stale responses
  current: PublicProbe | null;
  progress: { stepNumber: number; totalSteps: number; isEasier: boolean } | null;
  waitingStatus: StepStatus | null; // status of the step under the cursor when `current` is not ready
  finished: boolean;
  needsPrefetch: boolean;         // a pending step within the buffer window still needs generating
}

export interface PublicWorkspace {
  profile: DemoProfile;
  questionText: string;
  attachments: StoredAsset[];
  phase: WorkspacePhase;
  analysis: QuestionAnalysisPublic | null;
  probing: PublicProbing | null;
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
  };
}
