import type { ObservationCategory, SessionObservation } from '@/contracts/sessions';

const GROUPS: { category: ObservationCategory; label: string; className: string }[] = [
  { category: 'struggle', label: 'Struggles', className: 'border-clay/60' },
  { category: 'strength', label: 'Strengths', className: 'border-sage/60' },
  { category: 'what_works', label: 'What works', className: 'border-brand' },
  { category: 'habit', label: 'Habits', className: 'border-connector' },
];

/** AI observations grouped by category; empty groups are hidden. */
export function ObservationList({ observations }: { observations: SessionObservation[] }) {
  if (observations.length === 0) return <p className="text-sm text-muted">No observations for this session.</p>;
  return <div className="flex flex-col gap-4">
    {GROUPS.map(({ category, label, className }) => {
      const items = observations.filter(o => o.category === category);
      return items.length > 0 && <section key={category} aria-label={label}>
        <h3 className="text-sm font-semibold text-muted">{label}</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((o, i) => <li key={i} className={`border-l-2 pl-3 text-sm text-ink ${className}`}>
            {o.text}
            {o.quote && <q className="mt-0.5 block text-muted">{o.quote}</q>}
          </li>)}
        </ul>
      </section>;
    })}
  </div>;
}
