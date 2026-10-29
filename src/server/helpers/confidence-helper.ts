import type { ProbeCursor, ProbeStep } from '@/types/domain';

/** Minimum answer duration (seconds) below which an answer is considered suspiciously fast. */
const FAST_THRESHOLD_S = 4;

/** Fraction of answered questions that must be fast to flag. */
const FAST_FRACTION = 0.5;

/** Fraction of main probes that must be answered to maintain full confidence. */
const MIN_ANSWERED_FRACTION = 0.5;

/** Correct rate below which answers look random (4-option MCQ = 25% by chance). */
const RANDOM_CORRECT_RATE = 0.35;

/** Correct rate below which answers look like guessing even with partial knowledge. */
const LOW_CORRECT_RATE = 0.5;

export interface ConfidenceResult {
  level: 'high' | 'medium' | 'low';
  factors: Array<{ factor: string; detail: string }>;
  earlyExit: boolean;
}

/**
 * Confidence heuristic for the Tutor Brief. Evaluates the reliability of the
 * diagnostic data based on behavioral signals:
 *
 * 1. **Early exit** — student submitted before completing all steps
 * 2. **Random-clicking pattern** — very low correct rate on main probes
 * 3. **Suspiciously fast answers** — answered too quickly to read the question
 * 4. **Low coverage** — few questions answered
 *
 * High IDK rates do NOT lower confidence — genuine uncertainty is useful
 * diagnostic signal and is reported as an informational factor.
 */
export function computeConfidence(
  steps: ProbeStep[],
  cursor: ProbeCursor | null,
): ConfidenceResult {
  const factors: Array<{ factor: string; detail: string }> = [];
  let score = 0; // 0 = high, each penalty adds 1; mapped to level at the end

  const totalSteps = steps.length;
  if (totalSteps === 0) return { level: 'high', factors: [], earlyExit: false };

  const earlyExit = cursor !== null;

  // --- Factor 1: Early exit ---
  if (earlyExit) {
    score += 1;
    factors.push({
      factor: 'Early exit',
      detail: `Student submitted before completing all questions (reached step ${cursor.stepIndex + 1} of ${totalSteps}).`,
    });
  }

  // --- Factor 2: Correct rate on main probes (the strongest signal) ---
  // Exclude IDK from the correct-rate calculation — IDK is honest uncertainty,
  // not a guess. Only count answers where the student chose an option (A–D).
  const answeredMainSteps = steps.filter((s) => s.mainAnswer !== null && s.mainAnswer !== 'IDK');
  const correctMainCount = answeredMainSteps.filter((s) => s.mainAnswer === s.main?.correctOptionId).length;
  const mainAnsweredCount = answeredMainSteps.length;

  if (mainAnsweredCount >= 2) {
    const correctRate = correctMainCount / mainAnsweredCount;
    if (correctRate <= RANDOM_CORRECT_RATE) {
      // Looks like random guessing — ~25% on 4-option MCQs
      score += 2; // Heavy penalty — this is the strongest signal
      factors.push({
        factor: 'Likely random clicking',
        detail: `Only ${correctMainCount} of ${mainAnsweredCount} main answers correct (${Math.round(correctRate * 100)}%) — consistent with random guessing on multiple choice.`,
      });
    } else if (correctRate <= LOW_CORRECT_RATE) {
      // Below 50% but above random — could be partial knowledge or some guessing
      score += 1;
      factors.push({
        factor: 'Low correct rate',
        detail: `${correctMainCount} of ${mainAnsweredCount} main answers correct (${Math.round(correctRate * 100)}%) — may indicate guessing mixed with partial knowledge.`,
      });
    }
  }

  // --- Factor 3: Suspiciously fast answers ---
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
  const timedAnswerCount = answeredTimes.length;

  if (timedAnswerCount >= 2 && fastCount / timedAnswerCount > FAST_FRACTION) {
    score += 1;
    factors.push({
      factor: 'Very fast answers',
      detail: `${fastCount} of ${timedAnswerCount} answers were under ${FAST_THRESHOLD_S}s — may not have read the questions fully.`,
    });
  }

  // --- Factor 4: Low coverage (all main answers including IDK) ---
  const allMainAnswered = steps.filter((s) => s.mainAnswer !== null).length;
  if (allMainAnswered / totalSteps < MIN_ANSWERED_FRACTION) {
    score += 1;
    factors.push({
      factor: 'Few questions answered',
      detail: `Only ${allMainAnswered} of ${totalSteps} main questions were answered.`,
    });
  }

  // --- Informational: high IDK rate (does NOT lower confidence) ---
  const idkCount = steps.filter(
    (s) => s.mainAnswer === 'IDK' || s.easierAnswer === 'IDK',
  ).length;
  if (idkCount > 0) {
    factors.push({
      factor: 'Self-reported uncertainty',
      detail: `Student selected "I don't know" on ${idkCount} question${idkCount > 1 ? 's' : ''}. This is useful diagnostic signal.`,
    });
  }

  // --- Map score to level ---
  // 0 = high, 1 = medium, 2+ = low
  const level: 'high' | 'medium' | 'low' = score === 0 ? 'high' : score === 1 ? 'medium' : 'low';

  return { level, factors, earlyExit };
}
