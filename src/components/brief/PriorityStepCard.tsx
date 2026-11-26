import { CheckCircle2, Target } from "lucide-react";
import { MathText } from "@/components/shared/MathText";
import type { ProbeOutcome, ProbeResult } from "@/contracts/brief";
import { Badge, Card } from "@/components/shared/Card";

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
}: {
  results: ProbeResult[];
  priorityStepIndex: number | null;
}) {
  const main = results.find((r) => r.stepIndex === priorityStepIndex && r.kind === "main");

  if (!main) {
    const anyAttempted = results.some((r) => r.outcome !== "unanswered");
    return (
      <Card
        title="Priority · Key incorrect step"
        icon={<CheckCircle2 size={16} className="text-ink" aria-hidden="true" />}
      >
        <p className="text-sm text-muted">
          {anyAttempted ? "No incorrect answers were recorded. Check coverage before drawing conclusions." : "Not enough evidence yet."}
        </p>
      </Card>
    );
  }

  const easier = results.find((r) => r.stepIndex === priorityStepIndex && r.kind === "easier");
  const stepResults = easier ? [main, easier] : [main];
  const attempted = stepResults.filter((r) => r.outcome !== "unanswered").length;
  const correct = stepResults.filter((r) => r.outcome === "correct").length;
  const selected = selectedAnswer(main);

  return (
    <Card
      title="Priority · Key incorrect step"
      icon={<Target size={16} className="text-pink-deep" aria-hidden="true" />}
      badge={<Badge className="bg-wash text-ink">Needs review</Badge>}
    >
      <span className="text-sm font-semibold text-muted">{main.concept}</span>
      <MathText text={main.questionMarkdown} className="text-sm text-ink" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">{selected.label}</span>
          <MathText text={selected.text} className="text-sm font-bold text-pink-deep" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">Correct · {main.correctOptionId}</span>
          <MathText text={main.correctOptionText} className="text-sm font-bold text-ink" />
        </div>
      </div>
      <p className="text-sm text-muted">
        {easier ? RETRY_LINE[easier.outcome] : "No easier retry served"} · {correct}/{attempted} correct for this concept
      </p>
    </Card>
  );
}
