import type { ProbeCursor, ProbeStep } from '@/types/domain';

/** Minimum answer duration (seconds) below which an answer is considered suspiciously fast. */
const FAST_THRESHOLD_S = 3;

/** Fraction of answered questions that must be fast to lower confidence. */
const FAST_FRACTION = 0.5;

/** Fraction of main probes that must be answered to maintain full confidence. */
const MIN_ANSWERED_FRACTION = 0.5;

export interface ConfidenceResult {
  level: 'high' | 'medium' | 'low';
  factors: Array<{ factor: string; detail: string }>;
  earlyExit: boolean;
}

/**
 * Simple heuristic confidence score for the Tutor Brief, based on:
 * - Whether the student exited early (submitted before finishing all steps)
 * - Whether answers were suspiciously fast (possible random clicking)
 * - How many questions were answered
 *
 * High IDK rates do NOT lower confidence — genuine uncertainty is useful diagnostic signal.
 */
export function computeConfidence(
  steps: ProbeStep[],
  cursor: ProbeCursor | null,
): ConfidenceResult {
  const factors: Array<{ factor: string; detail: string }> = [];
  let level: 'high' | 'medium' | 'low' = 'high';

  const totalSteps = steps.length;
  const earlyExit = cursor !== null;

  if (earlyExit) {
    level = dropLevel(level);
    factors.push({
      factor: 'Early exit',
      detail: `Student submitted before completing all questions (reached step ${cursor.stepIndex + 1} of ${totalSteps}).`,
    });
  }

  // Compute timing from stored timestamps
  const answeredTimes: number[] = [];
  for (const step of steps) {
    if (step.mainShownAt && step.mainAnsweredAt) {
      const elapsed = (Date.parse(step.mainAnsweredAt) - Date.parse(step.mainShownAt)) / 1000;
      if (elapsed >= 0) answeredTimes.push(elapsed);
    }
    if (step.easierShownAt && step.easierAnsweredAt) {
      const elapsed = (Date.parse(step.easierAnsweredAt) - Date.parse(step.easierShownAt)) / 1000;
      if (elapsed >= 0) answeredTimes.push(elapsed);
    }
  }

  const fastCount = answeredTimes.filter((t) => t < FAST_THRESHOLD_S).length;
  const answeredCount = answeredTimes.length;

  if (answeredCount > 0 && fastCount / answeredCount > FAST_FRACTION) {
    level = dropLevel(level);
    factors.push({
      factor: 'Very fast answers',
      detail: `${fastCount} of ${answeredCount} answers were under ${FAST_THRESHOLD_S}s — may indicate random clicking.`,
    });
  }

  // Check answer coverage (main probes only)
  const mainAnswered = steps.filter((s) => s.mainAnswer !== null).length;
  const mainAttempted = steps.filter(
    (s) => s.mainAnswer !== null && s.mainAnswer !== undefined,
  ).length;

  if (totalSteps > 0 && mainAnswered / totalSteps < MIN_ANSWERED_FRACTION) {
    level = dropLevel(level);
    factors.push({
      factor: 'Few questions answered',
      detail: `Only ${mainAnswered} of ${totalSteps} main questions were answered.`,
    });
  }

  // Informational factor: high IDK rate (doesn't lower confidence)
  const idkCount = steps.filter(
    (s) => s.mainAnswer === 'IDK' || s.easierAnswer === 'IDK',
  ).length;
  if (idkCount > 0) {
    factors.push({
      factor: 'Self-reported uncertainty',
      detail: `Student selected "I don't know" on ${idkCount} question${idkCount > 1 ? 's' : ''}. This is useful diagnostic signal.`,
    });
  }

  return { level, factors, earlyExit };
}

function dropLevel(current: 'high' | 'medium' | 'low'): 'medium' | 'low' {
  return current === 'high' ? 'medium' : 'low';
}
