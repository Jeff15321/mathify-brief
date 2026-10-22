import { MathText } from "@/components/shared/MathText";
import type { ProbeOutcome, ProbeResult } from "@/types/domain";

const OUTCOME_COLOR: Record<ProbeOutcome, string> = {
  correct: "text-emerald-600",
  incorrect: "text-red-600",
  dont_know: "text-amber-700",
  unanswered: "text-slate-500",
};

/** One-line summary of what the student picked, with the key revealed for the tutor. */
function selectedLine(result: ProbeResult): string {
  return {
    correct: `Selected: ${result.selectedOptionText} (correct)`,
    incorrect: `Selected: ${result.selectedOptionText} (incorrect, correct answer: ${result.correctOptionText})`,
    dont_know: `Selected: I don't know (correct answer: ${result.correctOptionText})`,
    unanswered: "Selected: Unanswered",
  }[result.outcome];
}

/** One served probe in the probing results list; easier retries are indented under their main question. */
export function ProbeResultItem({ result }: { result: ProbeResult }) {
  const isEasier = result.kind === "easier";
  return (
    <div className={`flex flex-col gap-1 ${isEasier ? "ml-4 border-l-2 border-amber-200 pl-3" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {isEasier ? "Easier retry" : result.concept}
      </span>
      <MathText text={result.questionMarkdown} className="text-sm text-slate-800" />
      <MathText text={selectedLine(result)} className={`text-sm ${OUTCOME_COLOR[result.outcome]}`} />
      <MathText text={result.explanation} className="text-xs text-slate-500" />
    </div>
  );
}
