import { MathText } from "@/components/shared/MathText";
import type { ProbeOutcome, ProbeResult } from "@/contracts/brief";

const OUTCOME_COLOR: Record<ProbeOutcome, string> = {
  correct: "text-sage",
  incorrect: "text-clay",
  dont_know: "text-ink",
  unanswered: "text-muted",
};

/** One-line summary of what the student picked, with the key revealed for the tutor. */
function selectedLine(result: ProbeResult): string {
  return {
    correct: `Selected: ${result.selectedOptionText} (correct)`,
    incorrect: `Selected: ${result.selectedOptionText} (incorrect, correct answer: ${result.correctOptionText})`,
    dont_know: `Selected: I'm not sure (correct answer: ${result.correctOptionText})`,
    unanswered: "Selected: Unanswered",
  }[result.outcome];
}

/** One served probe in the probing results list; easier retries are indented under their main question. */
export function ProbeResultItem({ result }: { result: ProbeResult }) {
  const isEasier = result.kind === "easier";
  return (
    <div className={`flex flex-col gap-1 ${isEasier ? "ml-4 border-l-2 border-line pl-3" : ""}`}>
      <span className="text-sm font-semibold text-muted">
        {isEasier ? "Easier retry" : result.concept}
      </span>
      <MathText text={result.questionMarkdown} className="text-sm text-ink" />
      <MathText text={selectedLine(result)} className={`text-sm ${OUTCOME_COLOR[result.outcome]}`} />
      <MathText text={result.explanation} className="text-sm text-muted" />
    </div>
  );
}
