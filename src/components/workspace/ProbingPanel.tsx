import type { ReactNode } from "react";
import { ProbeCard } from "./ProbeCard";
import { LoadingState } from "@/components/shared/LoadingState";
import type { ProbeAnswer, PublicProbing } from "@/contracts/probes";

/**
 * The probing column: an optional heading, the current probe card (or a waiting/failed/
 * connecting message) and a submit button that works at any point.
 */
export function ProbingPanel({
  probing,
  selection,
  onSelect,
  onNext,
  onRetry,
  answering,
  onSubmit,
  submitting, hintOpened, onHintOpened, onVisible,
  heading, submitLabel = "Send to tutor", submittingLabel = "Sending…",
}: {
  probing: PublicProbing;
  selection: ProbeAnswer | undefined;
  onSelect: (answer: ProbeAnswer) => void;
  onNext: () => void;
  onRetry: () => void;
  answering: boolean;
  onSubmit: () => void;
  submitting: boolean;
  onVisible?: () => void;
  hintOpened?: boolean;
  onHintOpened?: () => void;
  heading?: ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
}) {
  const { current, progress, finished, waitingStatus } = probing;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* m-auto centers the question block both ways but still lets tall content scroll from the top. */}
      <div className="flex flex-1 overflow-y-auto pb-4">
        <div className="m-auto flex w-full max-w-2xl flex-col gap-4">
          {heading}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted">
              {progress ? `Question ${progress.stepNumber} of ${progress.totalSteps}` : "All questions answered"}
            </p>
            {progress?.isEasier && (
              <span className="rounded-full bg-clay-wash px-2 py-0.5 text-sm font-bold text-clay">
                Easier question
              </span>
            )}
          </div>

          {current && progress && (
            <ProbeCard
              key={current.id}
              probe={current}
              hintOpened={hintOpened} onHintOpened={onHintOpened} onVisible={onVisible}
              index={progress.stepNumber - 1}
              selected={selection}
              onSelect={onSelect}
              onNext={onNext}
              saving={answering}
              disabled={submitting}
            />
          )}

          {!current && !finished && waitingStatus !== "failed" && (
            <div className="rounded-card border border-line bg-card p-4">
              <LoadingState label="Preparing your next question…" />
            </div>
          )}

          {!current && !finished && waitingStatus === "failed" && (
            <div className="flex flex-col items-start gap-3 rounded-card border border-alert/40 bg-alert-wash p-4 text-sm text-alert">
              <p>We couldn&apos;t load your next question.</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-brand bg-card px-4 py-1.5 text-sm font-bold text-brand-deep hover:bg-wash"
              >
                Retry
              </button>
            </div>
          )}

          {finished && (
            <p className="rounded-card border border-line bg-card p-4 text-sm text-ink">
              You&apos;ve answered every question. Sending them to your tutor…
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 border-t border-line bg-ground pt-3">
        <p className="max-w-sm text-sm text-muted">You can connect with your tutor at any time.</p>
        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || answering}
            className={`w-full rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50 sm:w-auto ${
              finished
                ? "bg-brand text-card hover:bg-brand-deep"
                : "border border-brand bg-card text-brand-deep hover:bg-wash"
            }`}
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
