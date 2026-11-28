import type { TutorBrief } from '@/contracts/brief';
import { evidenceConfidence, evidenceSummary, type EvidenceStrength } from './evidence';

const TIER_STYLE: Record<EvidenceStrength, { text: string; bar: string }> = {
  strong: { text: 'text-sage', bar: 'bg-sage' },
  partial: { text: 'text-ink', bar: 'bg-brand' },
  limited: { text: 'text-clay', bar: 'bg-clay' },
};

export function EvidenceSummary({ brief, drawingOmitted }: { brief: TutorBrief; drawingOmitted: boolean }) {
  const facts = evidenceSummary(brief);
  const confidence = evidenceConfidence(brief);
  const style = TIER_STYLE[confidence.tier];
  return <section aria-labelledby="evidence-title" className="rounded-card border border-line bg-card p-4 space-y-1.5">
    <div className="flex items-center justify-between gap-3">
      <h2 id="evidence-title" className="text-sm font-bold text-ink">Confidence on the report</h2>
      <span className={`text-sm font-bold ${style.text}`}>{confidence.label}</span>
    </div>
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-fill"
      role="meter"
      aria-label="Evidence strength"
      aria-valuenow={confidence.meterValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${confidence.meterValue}%` }} />
    </div>
    <p className="text-sm font-bold text-ink">{facts.coverage}</p>
    <p className="text-sm text-ink">{facts.outcomes}</p>
    {confidence.posteriorRange && (
      <p className="text-sm text-muted">
        Bayesian readiness range: {confidence.posteriorRange}
        {confidence.guessAdjustedPercent !== null ? ` · guess-adjusted ${confidence.guessAdjustedPercent}%` : ''}
      </p>
    )}
    <p className="text-sm text-muted">
      {facts.unanswered} unanswered · {facts.notReached} concepts not reached · {facts.hintsOpened} hints opened
      {facts.rapidResponses > 0 ? ` · ${facts.rapidResponses} rapid (<3s)` : ''}
      {facts.hintUnknown ? ` · hint access unknown for ${facts.hintUnknown} questions` : ''}
    </p>
    <p className="text-sm text-muted">This is a snapshot of responses, not a mastery score. Help outside the app is unknown.</p>
    {drawingOmitted && <p className="text-sm text-ink">The drawing export was omitted from this handoff.</p>}
  </section>;
}
