import type { ReactNode } from "react";
import { ProbeCard } from "./ProbeCard";
import { LoadingState } from "@/components/shared/LoadingState";
import type { ProbeAnswer, PublicProbing } from "@/contracts/probes";

/**
 * Keeps the original problem and tutor handoff available throughout the warm-up.
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
  reference, submitLabel = "Create tutor brief", submittingLabel = "Creating brief…",
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
  reference?: ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
}) {
  const { current, progress, finished, waitingStatus } = probing;

  return (
    <>
      <header className="page-heading"><h1 className="page-title">Your warm-up</h1><p>Try one question at a time. Choosing “I don’t know” helps your tutor, too.</p></header>
      <div className="study-grid">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted">
              {progress ? `Question ${progress.stepNumber} of ${progress.totalSteps}` : "All questions answered"}
            </p>
            {progress?.isEasier && (
              <span className="rounded-full bg-wash px-2 py-0.5 text-sm font-semibold text-ink">
                Easier question
              </span>
            )}
          </div>

          {current && progress && (
            <ProbeCard
              key={current.id}
              probe={current}
              hintOpened={hintOpened} onHintOpened={onHintOpened} onVisible={onVisible}
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
            <div className="flex flex-col items-start gap-3 rounded-card border border-alert/30 bg-alert-wash p-4 text-sm text-ink">
              <p>We couldn&apos;t load your next question.</p>
              <button
                type="button"
                onClick={onRetry}
                className="action-secondary"
              >
                Retry
              </button>
            </div>
          )}

          {finished && (
            <p className="rounded-card border border-line bg-card p-4 text-sm text-ink">
              You&apos;ve answered every question. Preparing your tutor brief…
            </p>
          )}
        </div>
        <aside className="space-y-4">
          {reference && <section className="study-sheet space-y-3"><h2 className="section-title">Your original problem</h2>{reference}</section>}
          <section className="brief-action">
            <h2 className="section-title">Ready for your tutor?</h2>
            <p className="field-help">You can finish early. Your brief includes the answers and work you have so far.</p>
            <button type="button" className="action-secondary mt-4" disabled={submitting || answering} onClick={onSubmit}>
              {submitting ? submittingLabel : submitLabel}
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}
