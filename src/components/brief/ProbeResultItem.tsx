import { MathText } from "@/components/shared/MathText";
import type { ProbeResult } from "@/types/domain";

/** Each attempt pairs the original question with the student's recorded answer. */
export function ProbeResultItem({ result }: { result: ProbeResult }) {
  const label = result.kind === "main" ? "Main question" : "Simpler question";
  const selected = result.outcome === "dont_know" ? "I don’t know" : result.selectedOptionText ?? "No answer submitted";
  return (
    <section aria-label={`${label}: ${result.concept}`} className="min-w-0">
      <h4 className="mb-4 text-sm font-medium text-slate-500">{result.kind === "main" ? "First try" : "Simpler follow-up"}</h4>
      <dl className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <dt className="mb-1 text-sm font-medium text-slate-600">Question</dt>
          <dd><MathText text={result.questionMarkdown} className="[&_.katex]:inline-block overflow-x-auto text-lg font-semibold leading-relaxed text-slate-900" /></dd>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <dt className="mb-1 text-sm font-medium text-slate-600">Student answer</dt>
          <dd><MathText text={selected} className="[&_.katex]:inline-block overflow-x-auto text-lg font-semibold leading-relaxed text-slate-900" /></dd>
        </div>
      </dl>
    </section>
  );
}
