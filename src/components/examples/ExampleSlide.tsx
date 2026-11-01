"use client";

import type { ExampleQuestion } from "@/lib/example-data";
import { BreakdownDiagram } from "@/components/workspace/BreakdownDiagram";
import { ConfidenceCard } from "@/components/brief/ConfidenceCard";

/**
 * One example in the slideshow: shows original question, breakdown diagram,
 * a probe preview, and the simulated brief summary.
 */
export function ExampleSlide({ example }: { example: ExampleQuestion }) {
  const { analysis, probeSteps, simulatedBrief } = example;

  // Show the main probe from each step that has one
  const probePreviews = probeSteps
    .filter((s) => s.main)
    .map((s) => ({
      concept: s.main!.concept,
      question: s.main!.questionMarkdown,
      options: s.main!.options,
      hint: s.main!.hint,
      mainAnswer: s.mainAnswer,
      easierAnswer: s.easierAnswer,
      easierServed: s.easierServed,
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* Question header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            {example.gradeLevel}
          </span>
          <span>·</span>
          <span>{analysis.topic}</span>
          <span>·</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {analysis.gradeDifficulty.replace("_", " ")}
          </span>
        </div>
        <p className="text-lg font-semibold text-slate-800">{example.questionText}</p>
        <p className="mt-1 text-xs text-slate-500">
          Prewritten illustration with simulated responses, not a measured live-model result.
          Curriculum context: {example.gradeLevel} mathematics. Exact textbook attribution is unverified.
        </p>
      </div>

      {/* Breakdown diagram */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">How we break this down</h3>
        <BreakdownDiagram
          breakdown={analysis.breakdown}
          probePlan={analysis.probePlan}
          currentStepIndex={null}
        />
      </div>

      {/* Probe previews */}
      {probePreviews.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Illustrative probes</h3>
          <div className="flex flex-col gap-3">
            {probePreviews.map((probe, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 text-xs font-medium text-blue-600">{probe.concept}</p>
                <p className="text-sm text-slate-700">{probe.question}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {probe.options.map((opt) => {
                    const isSelected = probe.mainAnswer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`rounded border px-2 py-1 text-xs ${
                          isSelected
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <span className="font-medium">{opt.id}.</span> {opt.textMarkdown}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-amber-600">
                  💡 Hint: {probe.hint}
                </p>
                {probe.easierServed && (
                  <p className="mt-1 text-xs text-slate-400 italic">
                    Easier retry was served after incorrect answer.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Tutor Brief summary</h3>
        <div className="mb-3">
          <ConfidenceCard
            confidence={simulatedBrief.confidence}
            factors={simulatedBrief.confidenceFactors}
            earlyExit={simulatedBrief.earlyExit}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-700">Strengths</p>
            {simulatedBrief.strengths.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {simulatedBrief.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-emerald-600">✓ {s}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-emerald-400 italic">None identified</p>
            )}
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">Gaps</p>
            {simulatedBrief.gaps.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {simulatedBrief.gaps.map((g, i) => (
                  <li key={i} className="text-xs text-red-600">✗ {g}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-red-400 italic">No gaps observed in these simulated answers.</p>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-600">Core probes</p>
            <p className="text-slate-500">
              {simulatedBrief.core.correct}/{simulatedBrief.core.attempted} correct
              {simulatedBrief.core.dontKnow > 0 && `, ${simulatedBrief.core.dontKnow} "I don't know"`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-600">Easier retries</p>
            <p className="text-slate-500">
              {simulatedBrief.retries.attempted > 0
                ? `${simulatedBrief.retries.correct}/${simulatedBrief.retries.attempted} correct`
                : "None needed"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
