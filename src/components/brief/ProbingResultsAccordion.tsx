import { ChevronDown } from "lucide-react";
import type { ProbeResult } from "@/contracts/brief";
import { ProbeResultItem } from "./ProbeResultItem";

/**
 * Collapsed-by-default list of every question asked and the student's answers, grouped by step,
 * for the tutor to read in their own time.
 */
export function ProbingResultsAccordion({
  results,
  notReachedConcepts,
}: {
  results: ProbeResult[];
  notReachedConcepts: string[];
}) {
  const stepIndexes = [...new Set(results.map((r) => r.stepIndex))];
  const conceptCount = stepIndexes.length + notReachedConcepts.length;
  const responseCount = results.filter((r) => r.outcome !== "unanswered").length;

  return (
    <details className="group rounded-card border border-line bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-ink">Probing results</span>
          <span className="text-sm text-muted">
            {conceptCount} concepts · {responseCount} total responses · View questions and selected answers
          </span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-4">
        {stepIndexes.map((stepIndex) => (
          <div key={stepIndex} className="flex flex-col gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
            {results
              .filter((r) => r.stepIndex === stepIndex)
              .map((result) => (
                <ProbeResultItem key={result.probeId} result={result} />
              ))}
          </div>
        ))}
        {notReachedConcepts.length > 0 && (
          <p className="text-sm text-muted">Not reached before submitting: {notReachedConcepts.join(", ")}</p>
        )}
      </div>
    </details>
  );
}
