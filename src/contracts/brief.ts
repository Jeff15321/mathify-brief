import type { OptionId, ProbeKind } from './probes';

/** Deterministic per-probe outcome; "dont_know" is self-reported uncertainty, distinct from wrong or blank. */
export type ProbeOutcome = 'correct' | 'incorrect' | 'dont_know' | 'unanswered';

export interface ProbeResult {
  hintOpened?: boolean | null;
  durationMs?: number | null;
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
  /** Unique generation identity; optional for existing local reports. */
  reportId?: string;
  results: ProbeResult[];         // one per probe actually served
  notReachedConcepts: string[];   // planned steps the student never reached before submitting
  core: ProbeTally;
  retries: ProbeTally;
  strengths: string[];            // concepts answered correctly on the main probe
  gaps: string[];                 // concepts missed on the main probe (incorrect or IDK), whatever the retry outcome
  priorityStepIndex: number | null; // first step whose main answer was incorrect or "I don't know"
  generatedAt: string;
  briefVersion: 6;
  /** "Relevant from past sessions", added after the brief by `POST /api/brief/history`. */
  history?: BriefHistory;
}

export type BriefHistory =
  | { status: 'ready'; bullets: string[]; generatedAt: string; model: string; promptVersion: string }
  | { status: 'failed' };
