"use client";

import type { ProbePlanItem, QuestionAnalysisPublic, StudentBreakdownStep } from "@/types/domain";

/** Color coding for diagram step states. */
type StepState = "completed" | "current" | "pending";

function stepState(index: number, currentStepIndex: number | null): StepState {
  if (currentStepIndex === null) return "completed";
  if (index < currentStepIndex) return "completed";
  if (index === currentStepIndex) return "current";
  return "pending";
}

const STATE_CLASSES: Record<StepState, { node: string; connector: string; dot: string }> = {
  completed: {
    node: "border-emerald-300 bg-emerald-50 text-emerald-800",
    connector: "bg-emerald-300",
    dot: "bg-emerald-500",
  },
  current: {
    node: "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-200",
    connector: "bg-slate-200",
    dot: "bg-blue-500",
  },
  pending: {
    node: "border-slate-200 bg-slate-50 text-slate-500",
    connector: "bg-slate-200",
    dot: "bg-slate-300",
  },
};

/**
 * Visual diagram showing how a math question was broken down into concepts
 * and how probes map to those concepts. Renders as a top-down flow.
 *
 * @param breakdown - The student-safe breakdown steps from analysis.
 * @param probePlan - The ordered probe plan from analysis.
 * @param currentStepIndex - The 0-indexed step the student is currently on (null if finished).
 */
export function BreakdownDiagram({
  breakdown,
  probePlan,
  currentStepIndex,
}: {
  breakdown: StudentBreakdownStep[];
  probePlan: ProbePlanItem[];
  currentStepIndex: number | null;
}) {
  // Merge breakdown and probe plan by index (they're parallel arrays)
  const steps = probePlan.map((plan, i) => ({
    index: i,
    breakdownTitle: breakdown[i]?.title ?? plan.concept,
    breakdownDesc: breakdown[i]?.description ?? "",
    probeConcept: plan.concept,
    probeIntent: plan.intent,
    state: stepState(i, currentStepIndex),
  }));

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Question node */}
      <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
        Question
      </div>

      {steps.map((step, i) => {
        const classes = STATE_CLASSES[step.state];
        return (
          <div key={i} className="flex w-full flex-col items-center">
            {/* Connector line */}
            <div className={`h-4 w-0.5 ${classes.connector}`} />

            {/* Step node */}
            <div
              className={`flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-xs ${classes.node}`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${classes.dot}`} />
                <span className="font-semibold">{step.breakdownTitle}</span>
              </div>
              <p className="pl-4 text-[11px] opacity-75">{step.probeIntent}</p>
            </div>
          </div>
        );
      })}

      {/* End connector */}
      <div className="h-3 w-0.5 bg-emerald-300" />
      <div className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
        Done
      </div>
    </div>
  );
}
