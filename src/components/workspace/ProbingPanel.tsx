import { ProbeCard } from "./ProbeCard";
import { LoadingState } from "@/components/shared/LoadingState";
import type { ProbeAnswer, PublicProbing } from "@/types/domain";

/**
 * Middle panel: the current probe card (or a waiting/failed/finished message) and a Submit
 * button that works at any point.
 */
export function ProbingPanel({
  probing,
  selection,
  onSelect,
  onNext,
  onRetry,
  answering,
  onSubmit,
  submitting,
}: {
  probing: PublicProbing;
  selection: ProbeAnswer | undefined;
  onSelect: (answer: ProbeAnswer) => void;
  onNext: () => void;
  onRetry: () => void;
  answering: boolean;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const { current, progress, finished, waitingStatus } = probing;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* m-auto centers the question block both ways but still lets tall content scroll from the top. */}
      <div className="flex flex-1 overflow-y-auto pb-4">
        <div className="m-auto flex w-full max-w-xl flex-col gap-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {progress ? `Question ${progress.stepNumber} of ${progress.totalSteps}` : "All questions answered"}
            </p>
            {progress?.isEasier && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Easier question
              </span>
            )}
          </div>

          {current && progress && (
            <ProbeCard
              key={current.id}
              probe={current}
              index={progress.stepNumber - 1}
              selected={selection}
              onSelect={onSelect}
              onNext={onNext}
              saving={answering}
              disabled={submitting}
            />
          )}

          {!current && !finished && waitingStatus !== "failed" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <LoadingState label="Preparing your next question…" />
            </div>
          )}

          {!current && !finished && waitingStatus === "failed" && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>We couldn&apos;t load your next question.</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {finished && (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              You&apos;ve answered every question. Press Submit when you&apos;re ready.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 pt-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || answering}
          className={`w-full rounded-full px-6 py-3 text-sm font-semibold shadow-sm disabled:opacity-50 ${
            finished
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border border-blue-600 bg-white text-blue-700 hover:bg-blue-50"
          }`}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
