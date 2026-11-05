import { ChevronDown } from "lucide-react";
import type { ProbeResult } from "@/types/domain";
import { OutcomeLabel } from "./OutcomeLabel";
import { ConceptEvidence } from "./ConceptEvidence";
import { groupedConceptEvidence } from "./concept-evidence";

function NotServed() {
  return <span className="inline-flex h-8 w-[100px] items-center justify-center text-slate-400"><span aria-hidden="true">—</span><span className="sr-only">Not served</span></span>;
}

/** Grouped alphabetical rows disclose only their own recorded evidence. */
export function ConceptChecks({ results, notReachedConcepts }: {
  results: ProbeResult[];
  notReachedConcepts: string[];
}) {
  const groups = groupedConceptEvidence(results, notReachedConcepts);
  return (
    <section aria-label="Response summary" className="w-full border-y border-slate-300 py-5">
      {groups.length === 0 ? <p className="text-sm text-slate-600">No question evidence recorded.</p> : (
        <div>
          <div aria-hidden="true" className="mb-3 hidden max-w-lg grid-cols-[minmax(0,1fr)_212px] gap-3 px-3 min-[480px]:grid">
            <span />
            <div className="grid w-[212px] grid-cols-2 items-end gap-3 text-sm text-slate-500">
              <span>First try</span>
              <span>Simpler <span className="whitespace-nowrap">follow-up</span></span>
            </div>
          </div>
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`outcome-group-${group.id}`}>
                <h2 id={`outcome-group-${group.id}`} className="mb-2 text-sm font-semibold text-slate-600">{group.label}</h2>
                <ul className="space-y-2">
                  {group.concepts.map((entry, index) => (
                    <li key={entry.id}>
                      <details name="concept-evidence" id={entry.id} className={`group w-full max-w-lg rounded-md open:max-w-none ${index % 2 === 0 ? "bg-white" : "bg-slate-100"}`}>
                        <summary className="grid max-w-lg cursor-pointer list-none items-center gap-3 rounded-md p-3 hover:bg-slate-200/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-[480px]:grid-cols-[minmax(0,1fr)_212px] [&::-webkit-details-marker]:hidden">
                          <h3 title={entry.concept} className="flex min-w-0 items-start gap-2 text-base font-semibold leading-snug text-slate-900">
                            <ChevronDown aria-hidden="true" size={16} className="mt-0.5 shrink-0 group-open:rotate-180" />
                            <span className="truncate">{entry.displayName}</span>
                          </h3>
                          <span className="grid w-[212px] grid-cols-2 gap-3">
                            <span>
                              <span className="mb-1.5 block min-h-10 text-sm text-slate-500 min-[480px]:sr-only">First try</span>
                              {entry.main ? <OutcomeLabel appearance="badge" outcome={entry.main.outcome} /> : entry.notReached ? <span className="inline-flex h-8 w-[100px] items-center justify-center text-sm text-slate-500">Not reached</span> : <NotServed />}
                            </span>
                            <span>
                              <span className="mb-1.5 block min-h-10 text-sm text-slate-500 min-[480px]:sr-only">Simpler <span className="whitespace-nowrap">follow-up</span></span>
                              {entry.easier ? <OutcomeLabel appearance="badge" outcome={entry.easier.outcome} /> : <NotServed />}
                            </span>
                          </span>
                        </summary>
                        <ConceptEvidence {...entry} />
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
