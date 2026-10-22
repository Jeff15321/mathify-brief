import { ChevronDown } from "lucide-react";
import type { ProbeResult } from "@/types/domain";
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
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-900">Probing results</span>
          <span className="text-xs text-slate-500">
            {conceptCount} concepts · {responseCount} total responses · View questions and selected answers
          </span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-slate-100 p-4">
        {stepIndexes.map((stepIndex) => (
          <div key={stepIndex} className="flex flex-col gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            {results
              .filter((r) => r.stepIndex === stepIndex)
              .map((result) => (
                <ProbeResultItem key={result.probeId} result={result} />
              ))}
          </div>
        ))}
        {notReachedConcepts.length > 0 && (
          <p className="text-xs text-slate-500">Not reached before submitting: {notReachedConcepts.join(", ")}</p>
        )}
      </div>
    </details>
  );
}
