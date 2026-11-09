import type { TutorBrief } from '@/types/domain';
import { evidenceSummary } from '@/server/helpers/evidence-summary-helper';
export function EvidenceSummary({ brief, drawingOmitted }: { brief: TutorBrief; drawingOmitted: boolean }) {
  const facts = evidenceSummary(brief);
  return <section aria-labelledby="evidence-title" className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
    <h2 id="evidence-title" className="text-sm font-semibold text-slate-900">Confidence on the report</h2>
    <p className="text-base font-semibold text-slate-900">{facts.coverage}</p>
    <p className="text-sm text-slate-700">{facts.outcomes}</p>
    <p className="text-xs text-slate-600">{facts.unanswered} unanswered checks · {facts.notReached} concepts not reached · {facts.hintsOpened} hints opened{facts.hintUnknown ? ` · hint access unknown for ${facts.hintUnknown} checks` : ''}</p>
    <p className="text-xs text-slate-600">This is a snapshot of responses, not a mastery score. Help outside the app is unknown.</p>
    {drawingOmitted && <p className="text-xs text-amber-800">The drawing export was omitted from this handoff.</p>}
  </section>;
}
