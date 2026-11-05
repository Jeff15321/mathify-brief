"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

const questions = [
  { name: "accuracy", label: "Accuracy", description: "Does this report accurately reflect the student's work?" },
  { name: "clarity", label: "Clarity", description: "Is the report easy to understand?" },
  { name: "startingPointUsefulness", label: "Usefulness for choosing a starting point", description: "Does it help you decide where to begin tutoring?" },
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
    fetch(`/api/feedback?reportId=${encodeURIComponent(reportId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check whether feedback has already been saved.");
        const data = await response.json();
        if (!controller.signal.aborted) setStatus(data.feedback ? "saved" : "ready");
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
    const ratings = Object.fromEntries(questions.map(({ name }) => [name, Number(form.get(name))]));
    if (Object.values(ratings).some((rating) => rating < 1 || rating > 5)) {
      setError("Choose a rating for all three questions.");
      return;
    }
    submitting.current = true;
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, ...ratings, comments: String(form.get("comments") ?? "") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Feedback could not be saved. Please try again.");
      setStatus("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feedback could not be saved. Please try again.");
      setStatus("ready");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <section aria-labelledby="tutor-feedback-title" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="tutor-feedback-title" className="text-base font-semibold text-slate-900">Tutor feedback</h2>
      {status === "saved" ? (
        <p role="status" className="mt-2 text-sm text-emerald-800">Thank you — your feedback is saved for this report.</p>
      ) : status === "loading" ? (
        <p role="status" className="mt-2 text-sm text-slate-600">Checking feedback…</p>
      ) : status === "load-error" ? (
        <div className="mt-2 text-sm">
          <p role="alert">Could not check saved feedback. Try again before submitting.</p>
          <button type="button" className="mt-2 font-semibold text-blue-700 underline" onClick={() => { setStatus("loading"); setLoadAttempt((attempt) => attempt + 1); }}>Try again</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <p className="text-sm text-slate-600">After reviewing this report, rate each statement from 1 (strongly disagree) to 5 (strongly agree). All three ratings are required.</p>
          <fieldset disabled={status === "saving"} className="space-y-4 disabled:opacity-60">
            <legend className="sr-only">Report ratings</legend>
            {questions.map(({ name, label, description }) => (
              <fieldset key={name}>
                <legend className="text-sm font-medium text-slate-900">{label}</legend>
                <p className="mb-2 text-xs text-slate-600">{description}</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label key={rating} className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 text-sm has-checked:border-blue-600 has-checked:bg-blue-50">
                      <input type="radio" name={name} value={rating} required aria-label={`${label}: ${rating}`} className="accent-blue-600" />
                      {rating}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="block text-sm font-medium text-slate-900">
              What was missing or cluttered? <span className="font-normal text-slate-500">(optional)</span>
              <textarea name="comments" maxLength={2000} rows={2} className="mt-2 block w-full rounded-lg border border-slate-300 p-2 font-normal" />
              <span className="text-xs font-normal text-slate-500">Up to 2,000 characters.</span>
            </label>
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait">
              {status === "saving" ? "Saving feedback…" : "Save feedback"}
            </button>
          </fieldset>
          {status === "saving" && <p role="status" className="text-sm text-slate-600">Saving your feedback…</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </form>
      )}
    </section>
  );
}
