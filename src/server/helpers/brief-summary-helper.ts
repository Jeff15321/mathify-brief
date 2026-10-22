import type { ProbeKind, ProbeResult, ProbeTally, TutorBrief } from '@/types/domain';

export type BriefSummary = Pick<TutorBrief, 'core' | 'retries' | 'strengths' | 'gaps' | 'priorityStepIndex'>;

const MISSED = new Set(['incorrect', 'dont_know']);

/** Counts outcomes for one probe kind; `total` is supplied because unreached steps have no result. */
function tally(results: ProbeResult[], kind: ProbeKind, total: number): ProbeTally {
  const ofKind = results.filter((r) => r.kind === kind);
  return {
    total,
    attempted: ofKind.filter((r) => r.outcome !== 'unanswered').length,
    correct: ofKind.filter((r) => r.outcome === 'correct').length,
    incorrect: ofKind.filter((r) => r.outcome === 'incorrect').length,
    dontKnow: ofKind.filter((r) => r.outcome === 'dont_know').length,
  };
}

/**
 * Derives every Tutor Brief dashboard figure from the deterministic per-probe results.
 * Concepts are labelled by each step's main probe, so a step's main and easier probes share one name.
 * @param results - One result per served probe, in step order (see `computeResults`).
 * @param notReachedConcepts - Planned steps the student never reached; they count toward core `total`.
 */
export function summarizeBrief(results: ProbeResult[], notReachedConcepts: string[]): BriefSummary {
  const mains = results.filter((r) => r.kind === 'main');
  const easierByStep = new Map(results.filter((r) => r.kind === 'easier').map((r) => [r.stepIndex, r]));

  const strengths: string[] = [];
  const gaps: string[] = [];
  for (const main of mains) {
    const easier = easierByStep.get(main.stepIndex);
    if (main.outcome === 'correct') {
      strengths.push(main.concept);
    } else if (easier?.outcome === 'correct') {
      strengths.push(`${main.concept} (easier)`);
    } else if (MISSED.has(main.outcome)) {
      gaps.push(main.concept);
    }
  }

  const priority = mains.find((r) => MISSED.has(r.outcome));

  return {
    core: tally(results, 'main', mains.length + notReachedConcepts.length),
    retries: tally(results, 'easier', easierByStep.size),
    strengths,
    gaps,
    priorityStepIndex: priority ? priority.stepIndex : null,
  };
}
