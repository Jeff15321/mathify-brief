"use client";

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
          <p className="text-sm text-slate-600">Help us improve future reports. Choose one response for each question; all three are required.</p>
          <fieldset disabled={status === "saving"} className="space-y-5 disabled:opacity-60">
            <legend className="sr-only">Report ratings</legend>
            {questions.map(({ name, label, description, choices }) => (
              <fieldset key={name} aria-describedby={`${name}-description`}>
                <legend className="text-sm font-medium text-slate-900">{label}</legend>
                <p id={`${name}-description`} className="mb-2 text-sm text-slate-600">{description}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {choices.map((choice, index) => (
                    <label key={choice} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm leading-snug text-slate-700 hover:border-blue-400 has-checked:border-blue-600 has-checked:bg-blue-50 has-checked:font-medium has-checked:text-blue-900 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600">
                      <input type="radio" name={name} value={index + 1} required className="h-4 w-4 shrink-0 accent-blue-600" />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="block text-sm font-medium text-slate-900">
              What was inaccurate, missing, or unnecessary? <span className="font-normal text-slate-500">(optional)</span>
              <textarea name="comments" maxLength={2000} rows={2} className="mt-2 block w-full rounded-lg border border-slate-300 p-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
              <span className="text-xs font-normal text-slate-500">Up to 2,000 characters.</span>
            </label>
            <button type="submit" className="min-h-11 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait">
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
