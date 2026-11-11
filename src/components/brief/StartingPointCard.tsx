import type { ProbeResult, TutorBrief } from '@/types/domain';
import { suggestedStart } from '@/server/helpers/evidence-summary-helper';
import { MathText } from '@/components/shared/MathText';
function ResponseObservation({ result }: { result: ProbeResult }) {
  const selected = result.outcome === 'dont_know' ? "I don't know" : result.selectedOptionText ?? 'No response';
  return <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
    <MathText text={result.questionMarkdown} />
    <div><span className="text-slate-500">Student: </span><MathText text={selected} className="inline-block font-medium" /></div>
    <div className="text-xs text-slate-600">{result.outcome === 'correct' ? 'Correct response' : result.outcome === 'dont_know' ? 'Self-reported uncertainty' : result.outcome === 'unanswered' ? 'Unanswered' : 'Incorrect response'}{result.hintOpened === true ? ' · Hint opened' : ''}</div>
  </div>;
}
const RETRY = { correct: 'Simpler follow-up: correct', incorrect: 'Simpler follow-up: incorrect', dont_know: 'Simpler follow-up: “I don’t know”', unanswered: 'Simpler follow-up: unanswered' };
export function StartingPointCard({ brief }: { brief: TutorBrief }) {
  const start = suggestedStart(brief);
  return <section aria-labelledby="suggested-start-title" className="rounded-xl border border-blue-200 bg-white p-4 space-y-3">
    <h2 id="suggested-start-title" className="text-xs font-semibold uppercase tracking-wide text-blue-700">Suggested start</h2>
    <p className="text-lg font-semibold text-slate-900">{start.title}</p>
    <p className="text-sm text-slate-700">{start.move}</p>
    <p className="text-xs text-slate-600">{start.reason}</p>
    {start.observation && <ResponseObservation result={start.observation} />}
    {start.observation && <p className="text-sm font-medium text-slate-700">{start.retry ? RETRY[start.retry.outcome] : 'No simpler follow-up recorded'}</p>}
  </section>;
}
