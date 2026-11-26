import type { ProbeResult, TutorBrief } from '@/contracts/brief';
import { suggestedStart } from './evidence';
import { MathText } from '@/components/shared/MathText';
function ResponseObservation({ result }: { result: ProbeResult }) {
  const selected = result.outcome === 'dont_know' ? "I don't know" : result.selectedOptionText ?? 'No response';
  return <div className="space-y-1 rounded-panel bg-card p-3 text-sm">
    <MathText text={result.questionMarkdown} />
    <div><span className="text-muted">Student: </span><MathText text={selected} className="inline-block font-bold" /></div>
    <div className="text-sm text-muted">{result.outcome === 'correct' ? 'Correct response' : result.outcome === 'dont_know' ? 'Self-reported uncertainty' : result.outcome === 'unanswered' ? 'Unanswered' : 'Incorrect response'}{result.hintOpened === true ? ' · Hint opened' : ''}</div>
  </div>;
}
const RETRY = { correct: 'Simpler follow-up: correct', incorrect: 'Simpler follow-up: incorrect', dont_know: 'Simpler follow-up: “I don’t know”', unanswered: 'Simpler follow-up: unanswered' };
export function StartingPointCard({ brief }: { brief: TutorBrief }) {
  const start = suggestedStart(brief);
  return <section aria-labelledby="suggested-start-title" className="rounded-card border border-clay/25 bg-clay-wash p-4 space-y-3 sm:p-6">
    <h2 id="suggested-start-title" className="text-sm font-semibold text-clay">Suggested start</h2>
    <p className="text-xl font-bold text-ink">{start.title}</p>
    <p className="text-sm text-ink">{start.move}</p>
    <p className="text-sm text-muted">{start.reason}</p>
    {start.observation && <ResponseObservation result={start.observation} />}
    {start.observation && <p className="text-sm font-bold text-ink">{start.retry ? RETRY[start.retry.outcome] : 'No simpler follow-up recorded'}</p>}
  </section>;
}
