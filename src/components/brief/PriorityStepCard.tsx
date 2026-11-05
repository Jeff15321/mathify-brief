import { CheckCircle2, Target } from "lucide-react";
import { MathText } from "@/components/shared/MathText";
import type { ProbeOutcome, ProbeResult } from "@/types/domain";
import { BriefBadge, BriefCard } from "./BriefCard";

const RETRY_LINE: Record<ProbeOutcome, string> = {
  correct: "Easier retry correct",
  incorrect: "Easier retry also incorrect",
  dont_know: "Easier retry: I don't know",
  unanswered: "Easier retry not answered",
};

/** The option a result's student picked, as "letter" + text, or "I don't know" / "Unanswered". */
function selectedAnswer(result: ProbeResult): { label: string; text: string } {
  if (result.outcome === "dont_know") return { label: "Student selected", text: "I don't know" };
  if (result.selectedOptionId === null) return { label: "Student selected", text: "Unanswered" };
  return { label: `Student selected · ${result.selectedOptionId}`, text: result.selectedOptionText ?? "" };
}

/**
 * The single step a tutor should look at first: the first concept whose main question was missed,
 * with what the student picked, the correct answer, and how the easier retry went.
 * @param priorityStepIndex - Step to show, or null when there was no miss.
 */
export function PriorityStepCard({
  results,
  priorityStepIndex,
  notReachedConcepts = [],
}: {
  results: ProbeResult[];
  priorityStepIndex: number | null;
  notReachedConcepts?: string[];
}) {
  const main = results.find((r) => r.stepIndex === priorityStepIndex && r.kind === "main");

  if (!main) {
    const mains = results.filter((r) => r.kind === "main");
    const anyAttempted = mains.some((r) => r.outcome !== "unanswered");
    const incomplete = mains.some((r) => r.outcome === "unanswered") || notReachedConcepts.length > 0;
    return (
      <BriefCard
        title="Start here"
        icon={<CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />}
      >
        <p className="text-sm text-slate-600">
          {!anyAttempted
            ? "Not enough evidence yet. Start by asking the student to explain their approach to the original question."
            : incomplete
              ? "Attempted main questions were correct. Start with an unanswered or unreached concept to check understanding."
              : "All main questions were correct. Ask the student to apply these skills to the original question and explain their reasoning."}
        </p>
      </BriefCard>
    );
  }

  const easier = results.find((r) => r.stepIndex === priorityStepIndex && r.kind === "easier");
  const selected = selectedAnswer(main);

  return (
    <BriefCard
      title="Start here"
      icon={<Target size={16} className="text-red-600" aria-hidden="true" />}
      badge={<BriefBadge className="bg-red-100 text-red-700">Needs review</BriefBadge>}
    >
      <p className="text-base font-semibold text-slate-900">Review {main.concept}</p>
      <p className="text-sm text-slate-600">
        {main.outcome === "dont_know" ? "The student chose “I don't know” on the main question." : "The main answer was incorrect."}{" "}
        {easier ? `${RETRY_LINE[easier.outcome]}.` : "No easier retry served."}
      </p>
      <p className="text-sm text-slate-700">Ask the student to explain this step, then revisit it together.</p>
      <details className="rounded-lg border border-slate-200">
        <summary className="cursor-pointer p-3 text-sm font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">View priority question and answer</summary>
        <div className="flex flex-col gap-3 border-t border-slate-100 p-3">
          <MathText text={main.questionMarkdown} className="text-sm text-slate-900" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">{selected.label}</span>
              <MathText text={selected.text} className="text-sm font-medium text-red-700" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">Correct · {main.correctOptionId}</span>
              <MathText text={main.correctOptionText} className="text-sm font-medium text-emerald-700" />
            </div>
          </div>
        </div>
      </details>
    </BriefCard>
  );
}
