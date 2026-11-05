import type { ProbeTally } from "@/types/domain";
import { BriefCard } from "./BriefCard";

/** Compact evidence, keeping incorrect, explicit uncertainty and unattempted separate. */
export function ProbeEvidenceCard({ core, retries }: { core: ProbeTally; retries: ProbeTally }) {
  return (
    <BriefCard title="Evidence at a glance">
      <dl className="grid gap-3 sm:grid-cols-2">
        {([
          ["Core probes", core],
          ["Easier retries", retries],
        ] as const).map(([label, tally]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {tally.total === 0 ? "None served." : (
                <>
                  <span className="font-semibold">{tally.correct}/{tally.attempted} correct</span>
                  <span className="text-slate-500"> · {tally.attempted} of {tally.total} attempted</span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {tally.incorrect} incorrect · {tally.dontKnow} don&apos;t know · {tally.total - tally.attempted} unattempted
                  </span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </BriefCard>
  );
}
