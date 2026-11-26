import type { ProbeTally } from "@/contracts/brief";
import { Card } from "@/components/shared/Card";

/**
 * One tally of probe answers (Core probes or Easier retries).
 * @param emptyLabel - Shown instead of the numbers when no probes of this kind exist.
 */
export function ProbeTallyCard({ title, tally, emptyLabel }: { title: string; tally: ProbeTally; emptyLabel: string }) {
  return (
    <Card>
      <span className="text-sm font-bold text-muted">{title}</span>
      {tally.total === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <>
          <p className="text-ink">
            <span className="text-2xl font-bold">
              {tally.correct}/{tally.attempted}
            </span>{" "}
            <span className="text-sm text-muted">correct</span>
          </p>
          <p className="text-sm text-ink">
            {tally.attempted} of {tally.total} attempted
          </p>
          <p className="text-sm text-muted">
            {tally.incorrect} incorrect · {tally.dontKnow} don&apos;t know
          </p>
        </>
      )}
    </Card>
  );
}
