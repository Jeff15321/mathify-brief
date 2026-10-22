import type {
  AnsweredProbe,
  PrivateProbe,
  ProbeAnswer,
  ProbeCursor,
  ProbeKind,
  ProbeOutcome,
  ProbeResult,
  ProbeStep,
  PublicProbing,
} from '@/types/domain';
import { toPublicProbe } from '@/types/domain';

/** A "generating" step older than this is treated as failed (e.g. the server restarted mid-call). */
export const STALE_GENERATION_MS = 2 * 60 * 1000;

/** Builds the stable public probe id for a step's main or easier probe, e.g. "s1-main". */
export function probeIdFor(stepIndex: number, kind: ProbeKind): string {
  return `s${stepIndex + 1}-${kind}`;
}

/** Returns the probe under the cursor, or null when finished or when that step is not generated yet. */
export function currentProbe(steps: ProbeStep[], cursor: ProbeCursor | null): PrivateProbe | null {
  if (!cursor) return null;
  const step = steps[cursor.stepIndex];
  if (!step || step.status !== 'ready') return null;
  return cursor.kind === 'main' ? step.main : step.easier;
}

/** Classifies one answer against a probe's key. */
export function outcomeFor(probe: PrivateProbe, answer: ProbeAnswer | null): ProbeOutcome {
  if (answer === null) return 'unanswered';
  if (answer === 'IDK') return 'dont_know';
  return answer === probe.correctOptionId ? 'correct' : 'incorrect';
}

/**
 * Records an answer to the current probe and moves the cursor.
 * Main correct goes to the next step; main wrong or "I don't know" serves that step's easier
 * probe (at most once per step); any easier answer goes to the next step. Past the last step
 * the cursor becomes null.
 * @returns New steps and cursor; inputs are not mutated.
 */
export function advance(
  steps: ProbeStep[],
  cursor: ProbeCursor,
  answer: ProbeAnswer,
): { steps: ProbeStep[]; cursor: ProbeCursor | null } {
  const step = steps[cursor.stepIndex];
  const probe = cursor.kind === 'main' ? step.main : step.easier;
  if (!probe) throw new Error(`Step ${cursor.stepIndex} has no ${cursor.kind} probe to answer`);

  const nextMain: ProbeCursor | null =
    cursor.stepIndex + 1 < steps.length ? { stepIndex: cursor.stepIndex + 1, kind: 'main' } : null;

  let updated: ProbeStep;
  let next: ProbeCursor | null;
  if (cursor.kind === 'main') {
    const needsRetry = outcomeFor(probe, answer) !== 'correct';
    updated = { ...step, mainAnswer: answer, easierServed: needsRetry };
    next = needsRetry ? { stepIndex: cursor.stepIndex, kind: 'easier' } : nextMain;
  } else {
    updated = { ...step, easierAnswer: answer };
    next = nextMain;
  }

  return { steps: steps.map((s) => (s.index === step.index ? updated : s)), cursor: next };
}

function isStale(step: ProbeStep, now: number): boolean {
  return (
    step.status === 'generating' &&
    step.generationStartedAt !== null &&
    now - Date.parse(step.generationStartedAt) > STALE_GENERATION_MS
  );
}

/**
 * Picks the step whose pair should be generated next: the first step up to one ahead of the cursor
 * that is pending, failed (only when `includeFailed`), or stuck generating.
 * @returns The step index, or null when the buffer is full or the flow is finished.
 */
export function stepToGenerate(
  steps: ProbeStep[],
  cursor: ProbeCursor | null,
  { includeFailed, now = Date.now() }: { includeFailed: boolean; now?: number },
): number | null {
  if (!cursor) return null;
  const lastInWindow = Math.min(cursor.stepIndex + 1, steps.length - 1);
  for (let i = cursor.stepIndex; i <= lastInWindow; i++) {
    const step = steps[i];
    if (step.status === 'pending' || isStale(step, now) || (includeFailed && step.status === 'failed')) {
      return i;
    }
  }
  return null;
}

/**
 * Joins served probes with their keys into deterministic results.
 * Only probes the student actually saw are included; steps never reached are returned separately.
 */
export function computeResults(
  steps: ProbeStep[],
  cursor: ProbeCursor | null,
): { results: ProbeResult[]; notReachedConcepts: string[] } {
  const results: ProbeResult[] = [];
  const notReachedConcepts: string[] = [];

  for (const step of steps) {
    const reached = cursor === null || step.index <= cursor.stepIndex;
    if (!reached || !step.main) {
      notReachedConcepts.push(step.concept);
      continue;
    }
    results.push(toResult(step, step.main, 'main', step.mainAnswer));
    if (step.easierServed && step.easier) {
      results.push(toResult(step, step.easier, 'easier', step.easierAnswer));
    }
  }

  return { results, notReachedConcepts };
}

function toResult(step: ProbeStep, probe: PrivateProbe, kind: ProbeKind, answer: ProbeAnswer | null): ProbeResult {
  const outcome = outcomeFor(probe, answer);
  const selectedOptionId = answer && answer !== 'IDK' ? answer : null;
  return {
    probeId: probe.id,
    stepIndex: step.index,
    kind,
    concept: probe.concept,
    questionMarkdown: probe.questionMarkdown,
    selectedOptionId,
    selectedOptionText: probe.options.find((o) => o.id === selectedOptionId)?.textMarkdown ?? null,
    correctOptionId: probe.correctOptionId,
    correctOptionText: probe.options.find((o) => o.id === probe.correctOptionId)!.textMarkdown,
    isCorrect: outcome === 'correct' ? true : outcome === 'incorrect' ? false : null,
    outcome,
    explanation: probe.explanation,
  };
}

/** Lists already-answered probes for read-only display, without revealing correctness. */
function answeredHistory(steps: ProbeStep[]): AnsweredProbe[] {
  const history: AnsweredProbe[] = [];
  const push = (probe: PrivateProbe | null, kind: ProbeKind, answer: ProbeAnswer | null) => {
    if (!probe || answer === null) return;
    const selectedText =
      answer === 'IDK' ? "I don't know" : probe.options.find((o) => o.id === answer)?.textMarkdown ?? answer;
    history.push({ probeId: probe.id, kind, concept: probe.concept, questionMarkdown: probe.questionMarkdown, selectedText });
  };
  for (const step of steps) {
    push(step.main, 'main', step.mainAnswer);
    push(step.easier, 'easier', step.easierAnswer);
  }
  return history;
}

/**
 * Projects the private step list into the student-safe view: only the current probe (no key),
 * progress, and answered history. Buffered probes the student has not reached are never included.
 */
export function toPublicProbing(steps: ProbeStep[], cursor: ProbeCursor | null, revision: string): PublicProbing {
  const probe = currentProbe(steps, cursor);
  return {
    revision,
    current: probe ? toPublicProbe(probe) : null,
    progress: cursor
      ? { stepNumber: cursor.stepIndex + 1, totalSteps: steps.length, isEasier: cursor.kind === 'easier' }
      : null,
    waitingStatus: cursor && !probe ? steps[cursor.stepIndex].status : null,
    finished: cursor === null,
    needsPrefetch: stepToGenerate(steps, cursor, { includeFailed: false }) !== null,
    history: answeredHistory(steps),
  };
}
