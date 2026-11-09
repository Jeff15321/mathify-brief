import type { TutorBrief } from '@/types/domain';
/** Pure observation summaries, safe to use in either report rendering or server tests. */
export function evidenceSummary(brief: TutorBrief) {
  const hintsOpened = brief.results.filter(result => result.hintOpened === true).length;
  const hintUnknown = brief.results.filter(result => result.hintOpened == null).length;
  return {
    coverage: `${brief.core.attempted} of ${brief.core.total} core checks answered`,
    outcomes: `${brief.core.correct} correct · ${brief.core.incorrect} incorrect · ${brief.core.dontKnow} “I don't know”`,
    unanswered: brief.results.filter(result => result.outcome === 'unanswered').length,
    notReached: brief.notReachedConcepts.length,
    hintsOpened, hintUnknown,
    complete: brief.core.attempted === brief.core.total && brief.core.total > 0,
  };
}
export function suggestedStart(brief: TutorBrief) {
  const main = brief.results.find(r => r.kind === 'main' && r.stepIndex === brief.priorityStepIndex);
  const retry = main && brief.results.find(r => r.kind === 'easier' && r.stepIndex === main.stepIndex);
  if (main) return {
    title: retry?.outcome === 'correct' ? `Build on the simpler ${main.concept} example` : `Begin with ${main.concept}`,
    move: retry?.outcome === 'correct' ? 'Ask what changed between the two examples, then try a similar main check together.' : 'Try one small example together and ask the student to explain their first step.',
    reason: main.outcome === 'dont_know' ? 'First core check where the student chose “I don’t know”.' : 'First core check with an incorrect response.',
    observation: main, retry,
  };
  if (brief.core.attempted === 0) return {
    title: 'Ask where the student got stuck', move: 'Begin with their approach to the original problem.',
    reason: 'No responses were recorded. Understanding is still unknown.', observation: undefined, retry: undefined,
  };
  const untested = brief.notReachedConcepts[0] ?? brief.results.find(r => r.kind === 'main' && r.outcome === 'unanswered')?.concept;
  return {
    title: untested ? `Check ${untested} next` : 'Connect the checks to the original problem',
    move: untested ? 'Ask one short question about this skill before choosing a teaching approach.' : 'Ask the student to explain how they would use these skills on their problem.',
    reason: untested ? 'The recorded core responses were correct; coverage is incomplete.' : 'All planned core checks were answered correctly; this does not establish mastery.',
    observation: brief.results.find(r => r.kind === 'main' && r.outcome === 'correct'), retry: undefined,
  };
}
