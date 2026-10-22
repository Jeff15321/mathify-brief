import type { ProbeTally } from "@/types/domain";
import { BriefCard } from "./BriefCard";

/**
 * One tally of probe answers (Core probes or Easier retries).
 * @param emptyLabel - Shown instead of the numbers when no probes of this kind exist.
 */
export function ProbeTallyCard({ title, tally, emptyLabel }: { title: string; tally: ProbeTally; emptyLabel: string }) {
  return (
    <BriefCard>
      <span className="text-xs font-medium text-slate-500">{title}</span>
      {tally.total === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <>
          <p className="text-slate-900">
            <span className="text-2xl font-semibold">
              {tally.correct}/{tally.attempted}
            </span>{" "}
            <span className="text-xs text-slate-500">correct</span>
          </p>
          <p className="text-xs text-slate-700">
            {tally.attempted} of {tally.total} attempted
          </p>
          <p className="text-xs text-slate-500">
            {tally.incorrect} incorrect · {tally.dontKnow} don&apos;t know
          </p>
        </>
      )}
    </BriefCard>
  );
}
