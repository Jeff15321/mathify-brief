import { ProbeCard } from "./ProbeCard";
import type { ProbeAnswers, PublicProbe } from "@/types/domain";

export function ProbingPanel({
  probes,
  answers,
  onAnswer,
  onSubmit,
  submitting,
}: {
  probes: PublicProbe[];
  answers: ProbeAnswers;
  onAnswer: (probeId: string, optionId: "A" | "B" | "C" | "D") => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-900">Relevant Concepts</h2>
        <p className="text-xs text-slate-500">
          {answeredCount} of {probes.length} answered
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 pb-4">
          {probes.map((probe, index) => (
            <ProbeCard
              key={probe.id}
              probe={probe}
              index={index}
              selected={answers[probe.id]}
              onSelect={(optionId) => onAnswer(probe.id, optionId)}
            />
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 pt-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
