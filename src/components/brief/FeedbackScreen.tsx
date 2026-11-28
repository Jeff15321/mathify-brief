'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Frown, Meh, Smile } from 'lucide-react';
import { fetchWorkspace } from '@/client/workspace';
import { hasSavedFeedback, saveFeedback } from '@/client/feedback';
import { FEEDBACK_REASONS, FEEDBACK_REASON_LABELS, type FeedbackReason } from '@/schemas/feedback';
import type { PublicWorkspace } from '@/contracts/workspace';
import { suggestedStart } from './evidence';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

const FACES = [
  { value: 5, label: 'Accurate', subtitle: 'Matched the student well', Icon: Smile, tone: 'text-sage' },
  { value: 3, label: 'Somewhat accurate', subtitle: 'Partially right', Icon: Meh, tone: 'text-ink' },
  { value: 1, label: 'Inaccurate', subtitle: 'Missed the mark', Icon: Frown, tone: 'text-clay' },
] as const;

type FaceValue = (typeof FACES)[number]['value'];

/**
 * Post-brief tutor feedback page: 3-face accuracy rating plus optional 1-click reason chips
 * when Medium or Sad is chosen (no free-text box). Feeds calibration for future briefs.
 */
export default function FeedbackScreen() {
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<FaceValue | null>(null);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const submitting = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus('loading');
    setError(null);
    try {
      const current = await fetchWorkspace();
      if (signal?.aborted) return;
      if (!current?.brief || !current.feedbackReportId) {
        setWorkspace(null);
        setStatus('empty');
        return;
      }
      setWorkspace(current);
      const alreadySaved = await hasSavedFeedback(current.feedbackReportId, signal ?? new AbortController().signal);
      if (signal?.aborted) return;
      setStatus(alreadySaved ? 'saved' : 'ready');
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Could not load feedback status. Please try again.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function selectAccuracy(value: FaceValue) {
    setAccuracy(value);
    setError(null);
    if (value === 5) setReasons([]);
  }

  function toggleReason(reason: FeedbackReason) {
    setReasons((current) =>
      current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || status !== 'ready' || !workspace?.feedbackReportId) return;
    if (accuracy === null) {
      setError('Choose one of the three faces to rate accuracy.');
      return;
    }
    submitting.current = true;
    setStatus('saving');
    setError(null);
    try {
      await saveFeedback({
        reportId: workspace.feedbackReportId,
        accuracy,
        ...(reasons.length > 0 && accuracy < 5 ? { reasons } : {}),
        comments: '',
      });
      setStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback could not be saved. Please try again.');
      setStatus('ready');
    } finally {
      submitting.current = false;
    }
  }

  const start = workspace?.brief ? suggestedStart(workspace.brief) : null;

  return (
    <main className="min-h-screen bg-ground">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6 lg:p-12">
        <Link href="/workspace" className="inline-flex items-center gap-1 self-start text-sm font-bold text-muted hover:text-brand-deep">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to brief
        </Link>

        <header className="flex flex-col gap-1">
          <h1 className="page-title">Tutor feedback</h1>
          {workspace?.analysis && (
            <p className="text-sm text-muted">
              {workspace.analysis.topic}
              {start ? ` · ${start.title}` : ''}
            </p>
          )}
        </header>

        {status === 'loading' && <LoadingState label="Loading brief feedback…" />}

        {status === 'error' && error && <ErrorBanner message={error} onRetry={() => void load()} />}

        {status === 'empty' && (
          <div className="rounded-card border border-dashed border-connector bg-card p-6 text-sm text-muted">
            <p className="font-bold text-ink">No completed Tutor Brief yet</p>
            <p className="mt-1">
              Finish a question in the <Link href="/workspace" className="font-bold text-brand-deep underline">workspace</Link> before rating the brief.
            </p>
          </div>
        )}

        {status === 'saved' && (
          <section aria-label="Feedback saved" className="flex flex-col gap-4 rounded-card border border-line bg-sage-wash p-6">
            <div className="flex items-center gap-2 text-sage">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p role="status" className="text-base font-bold text-ink">
                Thank you — your feedback is saved and will calibrate future briefs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/workspace?new=1"
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-card hover:bg-brand-deep"
              >
                Start a new question
              </a>
              <Link
                href="/workspace"
                className="rounded-full border border-connector bg-card px-5 py-2.5 text-sm font-bold text-ink hover:bg-fill"
              >
                Back to brief
              </Link>
            </div>
          </section>
        )}

        {(status === 'ready' || status === 'saving') && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-card border border-line bg-card p-5 sm:p-6">
            <fieldset disabled={status === 'saving'} className="flex flex-col gap-4 disabled:opacity-60">
              <legend className="text-base font-bold text-ink">How accurate was this Tutor Brief?</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {FACES.map(({ value, label, subtitle, Icon, tone }) => {
                  const selected = accuracy === value;
                  return (
                    <label
                      key={value}
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border p-4 text-center transition-colors ${
                        selected ? 'border-brand bg-wash' : 'border-line bg-card hover:bg-fill'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accuracy"
                        value={value}
                        checked={selected}
                        onChange={() => selectAccuracy(value)}
                        className="sr-only"
                      />
                      <Icon className={`h-8 w-8 ${tone}`} aria-hidden="true" />
                      <span className="text-sm font-bold text-ink">{label}</span>
                      <span className="text-xs text-muted">{subtitle}</span>
                    </label>
                  );
                })}
              </div>

              {accuracy !== null && accuracy < 5 && (
                <div className="flex flex-col gap-2 border-t border-line pt-4">
                  <p className="text-sm font-bold text-ink">What missed the mark? (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_REASONS.map((reason) => {
                      const active = reasons.includes(reason);
                      return (
                        <button
                          key={reason}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleReason(reason)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                            active
                              ? 'border-brand bg-wash text-brand-deep'
                              : 'border-connector bg-card text-ink hover:bg-fill'
                          }`}
                        >
                          {FEEDBACK_REASON_LABELS[reason]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </fieldset>

            {error && <ErrorBanner message={error} />}

            <button
              type="submit"
              disabled={status === 'saving'}
              className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-card hover:bg-brand-deep disabled:opacity-50"
            >
              {status === 'saving' ? 'Saving feedback…' : 'Save feedback'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
