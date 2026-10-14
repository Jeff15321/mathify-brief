import Link from "next/link";
import { MathText } from "@/components/shared/MathText";
import type { PublicWorkspace, TutorBrief } from "@/types/domain";

export function TutorBriefView({ workspace, brief }: { workspace: PublicWorkspace; brief: TutorBrief }) {
  const analysis = workspace.analysis!;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Tutor Brief</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            Grade {workspace.profile.grade}
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
            {analysis.topic}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Question</h2>
        <MathText text={analysis.parsedQuestionMarkdown} className="text-sm text-slate-700" />
        {workspace.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {workspace.attachments.map((asset) => (
              <li key={asset.id}>
                <a href={`/api/assets/${asset.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  {asset.fileName}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">At a glance</h2>
        <p className="text-sm text-slate-700">
          {brief.correctCount} correct / {brief.answeredCount} answered
          {brief.unansweredCount > 0 && <span className="text-slate-500"> · {brief.unansweredCount} unanswered</span>}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Probing results</h2>
        {brief.results.map((result) => (
          <div key={result.probeId} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{result.concept}</span>
            <MathText text={result.questionMarkdown} className="text-sm text-slate-800" />
            <p className="text-sm">
              Selected:{" "}
              <span className={result.isCorrect === false ? "text-red-600" : result.isCorrect ? "text-emerald-600" : "text-slate-500"}>
                {result.selectedOptionText ?? "Unanswered"}
              </span>
              {result.selectedOptionId && (
                <span className="ml-2 text-slate-500">
                  ({result.isCorrect ? "correct" : "incorrect"} — correct answer: {result.correctOptionText})
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">{result.explanation}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-800">Observed strengths</h3>
          {brief.strengths.length === 0 && <p className="text-xs text-emerald-700">Not enough evidence.</p>}
          <ul className="flex flex-col gap-2">
            {brief.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-800">
                {s.observation}
                <div className="text-xs text-emerald-700">{s.evidence}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Possible gaps</h3>
          {brief.possibleGaps.length === 0 && <p className="text-xs text-amber-700">Not enough evidence.</p>}
          <ul className="flex flex-col gap-2">
            {brief.possibleGaps.map((g, i) => (
              <li key={i} className="text-sm text-amber-800">
                {g.observation}
                <div className="text-xs text-amber-700">{g.evidence}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {workspace.whiteboardAsset && (
        <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Whiteboard observations</h2>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {brief.whiteboardObservations.map((obs, i) => (
              <li key={i}>{obs}</li>
            ))}
          </ul>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assets/${workspace.whiteboardAsset.id}`}
            alt="Submitted whiteboard"
            className="max-h-96 w-auto rounded-lg border border-slate-200"
          />
        </section>
      )}

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-blue-800">Grade-level assessment</h2>
        <p className="text-sm text-blue-800">{brief.gradeAssessment}</p>
        <h3 className="mt-3 mb-1 text-sm font-semibold text-blue-800">Suggested starting point</h3>
        <p className="text-sm text-blue-800">{brief.suggestedStartingPoint}</p>
      </section>

      <Link
        href="/"
        className="self-start rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Start a new question
      </Link>
    </div>
  );
}
