import type { ConceptEvidenceEntry } from "./concept-evidence";
import { ProbeResultItem } from "./ProbeResultItem";

/** One row's main/simpler evidence, rendered only inside its native disclosure. */
export function ConceptEvidence({ concept, main, easier, notReached }: ConceptEvidenceEntry) {
  return (
    <div className="border-t border-slate-200 p-3 sm:p-4">
      <p className="mb-5 text-sm text-slate-500">{concept}</p>
      {notReached ? <p className="text-sm text-slate-500">Not reached before submitting. No question or answer recorded.</p> : (
        <div className={main && easier ? "grid gap-5 sm:grid-cols-2 sm:gap-6" : "max-w-2xl"}>
          {main && <ProbeResultItem result={main} />}
          {easier && <div className={main ? "border-t border-slate-200 pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6" : ""}><ProbeResultItem result={easier} /></div>}
        </div>
      )}
    </div>
  );
}
