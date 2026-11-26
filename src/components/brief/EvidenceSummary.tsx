import type { TutorBrief } from '@/contracts/brief';
import { evidenceSummary } from './evidence';
export function EvidenceSummary({ brief, drawingOmitted }: { brief: TutorBrief; drawingOmitted: boolean }) {
  const facts = evidenceSummary(brief);
  return <section aria-labelledby="evidence-title" className="rounded-card border border-line bg-card p-4 space-y-2">
    <h2 id="evidence-title" className="text-sm font-bold text-ink">Confidence on the report</h2>
    <p className="text-base font-bold text-ink">{facts.coverage}</p>
    <p className="text-sm text-ink">{facts.outcomes}</p>
    <p className="text-sm text-muted">{facts.unanswered} unanswered · {facts.notReached} concepts not reached · {facts.hintsOpened} hints opened{facts.hintUnknown ? ` · hint access unknown for ${facts.hintUnknown} questions` : ''}</p>
    <p className="text-sm text-muted">This is a snapshot of responses, not a mastery score. Help outside the app is unknown.</p>
    {drawingOmitted && <p className="text-sm text-ink">The drawing export was omitted from this handoff.</p>}
  </section>;
}
