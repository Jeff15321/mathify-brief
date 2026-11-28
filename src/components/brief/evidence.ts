import type { TutorBrief } from '@/contracts/brief';
import { betaCredibleInterval } from '@/contracts/stats';

export const RAPID_RESPONSE_MS = 3000;
export type EvidenceStrength = 'strong' | 'partial' | 'limited';

/** Pure observation summaries, safe to use in either report rendering or server tests. */
export function evidenceSummary(brief: TutorBrief) {
  const hintsOpened = brief.results.filter(result => result.hintOpened === true).length;
  const hintUnknown = brief.results.filter(result => result.hintOpened == null).length;
  const rapidResponses = brief.results.filter(
    result => result.outcome !== 'unanswered' && result.durationMs != null && result.durationMs < RAPID_RESPONSE_MS && result.hintOpened !== true,
  ).length;
  return {
    coverage: `${brief.core.attempted} of ${brief.core.total} core practice questions answered`,
    outcomes: `${brief.core.correct} correct · ${brief.core.incorrect} incorrect · ${brief.core.dontKnow} “I'm not sure”`,
    unanswered: brief.results.filter(result => result.outcome === 'unanswered').length,
    notReached: brief.notReachedConcepts.length,
    hintsOpened, hintUnknown, rapidResponses,
    complete: brief.core.attempted === brief.core.total && brief.core.total > 0,
  };
}

/**
 * Beta-Binomial posterior + 4-choice guessing adjustment for diagnostic certainty.
 * Distinguishes coverage (sample size) from readiness and discounts hint-assisted or rapid (<3s)
 * correct answers so tutors know when evidence is thin vs. reliable.
 */
export function evidenceConfidence(brief: TutorBrief): {
  tier: EvidenceStrength;
  label: string;
  meterValue: number;
  posteriorRange: string | null;
  guessAdjustedPercent: number | null;
  rapidResponses: number;
} {
  const { core, results } = brief;
  const rapidResponses = results.filter(
    r => r.outcome !== 'unanswered' && r.durationMs != null && r.durationMs < RAPID_RESPONSE_MS && r.hintOpened !== true,
  ).length;

  if (core.total === 0 || core.attempted === 0) {
    return { tier: 'limited', label: 'Limited evidence', meterValue: 10, posteriorRange: null, guessAdjustedPercent: null, rapidResponses };
  }

  let alpha = 1;
  let beta = 1;
  for (const r of results.filter(item => item.kind === 'main')) {
    if (r.outcome === 'correct') {
      const discounted = r.hintOpened === true || (r.durationMs != null && r.durationMs < RAPID_RESPONSE_MS);
      alpha += discounted ? 0.5 : 1.0;
      if (discounted) beta += 0.25;
    } else if (r.outcome === 'incorrect') {
      beta += 1.0;
    } else if (r.outcome === 'dont_know') {
      // Honest uncertainty carries zero guessing noise.
      beta += 0.75;
    }
  }

  const interval = betaCredibleInterval(alpha, beta);
  const halfWidth = (interval.upper - interval.lower) / 2;
  const mcAttempts = core.correct + core.incorrect;
  const mcRatio = mcAttempts / core.total;
  const coverage = core.attempted / core.total;
  const guessAdjusted = mcAttempts > 0 ? Math.max(0, (core.correct / mcAttempts - 0.25) / 0.75) : null;

  let tier: EvidenceStrength = 'partial';
  if (coverage < 0.5 || (core.total >= 3 && mcAttempts < 2 && core.dontKnow === 0)) {
    tier = 'limited';
  } else if (coverage >= 0.8 && mcRatio >= 0.8 && halfWidth <= 0.31) {
    tier = 'strong';
  }

  const meterValue = Math.round(
    Math.min(100, Math.max(15, coverage * 60 + (1 - Math.min(0.5, halfWidth)) * 40 * mcRatio)),
  );
  const label = tier === 'strong' ? 'Strong evidence' : tier === 'partial' ? 'Partial evidence' : 'Limited evidence';
  const posteriorRange = `${Math.round(interval.lower * 100)}%–${Math.round(interval.upper * 100)}%`;

  return {
    tier,
    label,
    meterValue,
    posteriorRange,
    guessAdjustedPercent: guessAdjusted !== null ? Math.round(guessAdjusted * 100) : null,
    rapidResponses,
  };
}
export function suggestedStart(brief: TutorBrief) {
  const main = brief.results.find(r => r.kind === 'main' && r.stepIndex === brief.priorityStepIndex);
  const retry = main && brief.results.find(r => r.kind === 'easier' && r.stepIndex === main.stepIndex);
  if (main) return {
    title: retry?.outcome === 'correct' ? `Build on the simpler ${main.concept} example` : `Begin with ${main.concept}`,
    move: retry?.outcome === 'correct' ? 'Ask what changed between the two examples, then try a similar practice question together.' : 'Try one small example together and ask the student to explain their first step.',
    reason: main.outcome === 'dont_know' ? 'First core question where the student chose “I’m not sure”.' : 'First core question with an incorrect response.',
    observation: main, retry,
  };
  if (brief.core.attempted === 0) return {
    title: 'Ask where the student got stuck', move: 'Begin with their approach to the original problem.',
    reason: 'No responses were recorded. Understanding is still unknown.', observation: undefined, retry: undefined,
  };
  const untested = brief.notReachedConcepts[0] ?? brief.results.find(r => r.kind === 'main' && r.outcome === 'unanswered')?.concept;
  return {
    title: untested ? `Check ${untested} next` : 'Return to the original problem',
    move: untested ? 'Ask one short question about this skill before choosing a teaching approach.' : 'Ask the student to explain how they would use these skills on their problem.',
    reason: untested ? 'The recorded core responses were correct; coverage is incomplete.' : 'All core answers were correct. This does not establish mastery.',
    observation: brief.results.find(r => r.kind === 'main' && r.outcome === 'correct'), retry: undefined,
  };
}
