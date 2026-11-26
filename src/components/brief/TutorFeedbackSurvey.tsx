"use client";

import { hasSavedFeedback, saveFeedback } from "@/client/feedback";
import { useEffect, useRef, useState, type FormEvent } from "react";

const questions = [
  {
    name: "accuracy",
    label: "Accuracy",
    description: "How well did this report reflect the student's work?",
    choices: ["Very inaccurate", "Inaccurate", "Mixed", "Accurate", "Very accurate"],
  },
  {
    name: "clarity",
    label: "Clarity",
    description: "How easy was the report to understand?",
    choices: ["Very difficult", "Difficult", "Neither difficult nor easy", "Easy", "Very easy"],
  },
  {
    name: "startingPointUsefulness",
    label: "Usefulness",
    description: "How useful was the report for understanding where the student needs support?",
    choices: ["Not useful", "Slightly useful", "Somewhat useful", "Useful", "Very useful"],
  },
] as const;

/** The keyed inner form discards drafts and pending status when the report changes. */
export function TutorFeedbackSurvey({ reportId }: { reportId: string }) {
  return <FeedbackForm key={reportId} reportId={reportId} />;
}

function FeedbackForm({ reportId }: { reportId: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "load-error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    hasSavedFeedback(reportId, controller.signal)
      .then(saved => {
        if (!controller.signal.aborted) setStatus(saved ? "saved" : "ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("load-error");
      });
    return () => controller.abort();
  }, [reportId, loadAttempt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || status !== "ready") return;
    const form = new FormData(event.currentTarget);
    const ratings = {
      accuracy: Number(form.get("accuracy")),
      clarity: Number(form.get("clarity")),
      startingPointUsefulness: Number(form.get("startingPointUsefulness")),
    };
    if (Object.values(ratings).some((rating) => rating < 1 || rating > 5)) {
      setError("Choose a rating for all three questions.");
      return;
    }
    submitting.current = true;
    setStatus("saving");
    setError(null);
    try {
      await saveFeedback({ reportId, ...ratings, comments: String(form.get("comments") ?? "") });
      setStatus("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feedback could not be saved. Please try again.");
      setStatus("ready");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <section aria-labelledby="tutor-feedback-title" className="rounded-card border border-line bg-card p-4 sm:p-5">
      <h2 id="tutor-feedback-title" className="text-base font-bold text-ink">Tutor feedback</h2>
      {status === "saved" ? (
        <p role="status" className="mt-2 text-sm text-ink">Thank you — your feedback is saved for this report.</p>
      ) : status === "loading" ? (
        <p role="status" className="mt-2 text-sm text-muted">Checking feedback…</p>
      ) : status === "load-error" ? (
        <div className="mt-2 text-sm">
          <p role="alert">Could not check saved feedback. Try again before submitting.</p>
          <button type="button" className="mt-2 font-bold text-pink-deep underline" onClick={() => { setStatus("loading"); setLoadAttempt((attempt) => attempt + 1); }}>Try again</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <p className="text-sm text-muted">Rate each item from 1–5. All ratings required.</p>
          <fieldset disabled={status === "saving"} className="space-y-5 disabled:opacity-60">
            <legend className="sr-only">Report ratings</legend>
            {questions.map(({ name, label, description, choices }) => (
              <fieldset key={name} aria-describedby={`${name}-description`}>
                <legend className="text-sm font-bold text-ink">{label}</legend>
                <p id={`${name}-description`} className="mb-2 text-sm text-muted">{description}</p>
                <div className="w-full max-w-72">
                  <div className="grid grid-cols-5 gap-2">
                    {choices.map((choice, index) => (
                      <label key={choice} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-panel border border-connector px-1 py-2 text-sm leading-snug text-ink hover:border-pink has-checked:border-pink has-checked:bg-wash has-checked:font-bold has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pink">
                        <input type="radio" name={name} value={index + 1} required aria-label={`${index + 1} — ${choice}`} className="h-4 w-4 shrink-0 accent-pink" />
                        <span>{index + 1}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-sm text-muted" aria-hidden="true">
                    <span>{choices[0]}</span>
                    <span className="text-right">{choices[4]}</span>
                  </div>
                </div>
              </fieldset>
            ))}
            <label className="block text-sm font-bold text-ink">
              What was inaccurate, missing, or unnecessary? <span className="font-normal text-muted">(optional)</span>
              <textarea name="comments" maxLength={2000} rows={2} className="mt-2 block w-full rounded-panel border border-connector p-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink" />
              <span className="text-sm font-normal text-muted">Up to 2,000 characters.</span>
            </label>
            <button type="submit" className="min-h-11 rounded-full bg-pink px-4 py-2 text-sm font-bold text-card hover:bg-pink-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-wait">
              {status === "saving" ? "Saving feedback…" : "Save feedback"}
            </button>
          </fieldset>
          {status === "saving" && <p role="status" className="text-sm text-muted">Saving your feedback…</p>}
          {error && <p role="alert" className="text-sm text-pink-deep">{error}</p>}
        </form>
      )}
    </section>
  );
}
