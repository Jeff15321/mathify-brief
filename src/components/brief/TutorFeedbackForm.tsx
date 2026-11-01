"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { submitTutorFeedback, type TutorFeedbackInput } from "@/lib/api-client";
import { ErrorBanner } from "@/components/shared/ErrorBanner";

export function TutorFeedbackForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TutorFeedbackInput>({
    overallUsefulness: 0,
    breakdownAccuracy: 0,
    probeQuality: 0,
    comments: "",
  });

  function setRating(field: "overallUsefulness" | "breakdownAccuracy" | "probeQuality", value: number) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (data.overallUsefulness === 0 || data.breakdownAccuracy === 0 || data.probeQuality === 0) {
      setError("Please rate all three areas before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitTutorFeedback(data);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        Thank you for your feedback! It helps us improve the Tutor Brief.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Tutor Feedback</h3>
      <p className="text-xs text-slate-500">
        Rate each area from 1 (poor) to 5 (excellent). Comments are optional.
      </p>
      {error && <ErrorBanner message={error} />}
      <fieldset disabled={submitting} className="flex flex-col gap-4">

      <RatingField
        label="Overall usefulness"
        value={data.overallUsefulness}
        onChange={(v) => setRating("overallUsefulness", v)}
      />
      <RatingField
        label="Breakdown accuracy"
        value={data.breakdownAccuracy}
        onChange={(v) => setRating("breakdownAccuracy", v)}
      />
      <RatingField
        label="Probe quality"
        value={data.probeQuality}
        onChange={(v) => setRating("probeQuality", v)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="feedback-comments" className="text-xs font-medium text-slate-700">
          Additional comments (optional)
        </label>
        <textarea
          id="feedback-comments"
          value={data.comments}
          onChange={(e) => setData((prev) => ({ ...prev, comments: e.target.value }))}
          rows={3}
          maxLength={5000}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          placeholder="What would you change? What was most useful?"
        />
      </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting || data.overallUsefulness === 0 || data.breakdownAccuracy === 0 || data.probeQuality === 0}
        className="flex items-center justify-center gap-2 self-start rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        <Send size={14} aria-hidden="true" />
        {submitting ? "Sending…" : "Submit feedback"}
      </button>
    </form>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-slate-700">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-8 w-8 rounded-full border text-xs font-semibold transition-colors ${
              n <= value
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-white text-slate-400 hover:border-blue-300"
            }`}
            aria-label={`${n} out of 5`}
            aria-pressed={n === value}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
