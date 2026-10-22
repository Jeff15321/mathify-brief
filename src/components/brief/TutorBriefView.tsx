import Link from "next/link";
import { MathText } from "@/components/shared/MathText";
import { GRADE_DIFFICULTY_CLASS, GRADE_DIFFICULTY_LABEL } from "@/lib/grade-difficulty";
import type { ProbeOutcome, ProbeResult, PublicWorkspace, TutorBrief } from "@/types/domain";

const OUTCOME_COLOR: Record<ProbeOutcome, string> = {
  correct: "text-emerald-600",
  incorrect: "text-red-600",
  dont_know: "text-amber-700",
  unanswered: "text-slate-500",
};

/** One-line summary of what the student picked, with the key revealed for the tutor. */
function selectedLine(result: ProbeResult): string {
  return {
    correct: `Selected: ${result.selectedOptionText} (correct)`,
    incorrect: `Selected: ${result.selectedOptionText} (incorrect — correct answer: ${result.correctOptionText})`,
    dont_know: `Selected: I don't know (correct answer: ${result.correctOptionText})`,
    unanswered: "Selected: Unanswered",
  }[result.outcome];
}

/** Renders one served probe; easier retries are indented under their main question. */
function ResultItem({ result }: { result: ProbeResult }) {
  const isEasier = result.kind === "easier";
  return (
    <div className={`flex flex-col gap-1 ${isEasier ? "ml-4 border-l-2 border-amber-200 pl-3" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {isEasier ? "Easier retry" : result.concept}
      </span>
      <MathText text={result.questionMarkdown} className="text-sm text-slate-800" />
      <MathText text={selectedLine(result)} className={`text-sm ${OUTCOME_COLOR[result.outcome]}`} />
      <MathText text={result.explanation} className="text-xs text-slate-500" />
    </div>
  );
}

export function TutorBriefView({ workspace, brief }: { workspace: PublicWorkspace; brief: TutorBrief }) {
  const analysis = workspace.analysis!;
  const stepIndexes = [...new Set(brief.results.map((result) => result.stepIndex))];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Tutor Brief</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            Student: Grade {workspace.profile.grade}
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
            Question: {analysis.estimatedQuestionGrade}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${GRADE_DIFFICULTY_CLASS[analysis.gradeDifficulty]}`}>
            {GRADE_DIFFICULTY_LABEL[analysis.gradeDifficulty]}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
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
          {brief.dontKnowCount > 0 && <span className="text-amber-700"> · {brief.dontKnowCount} don&apos;t know</span>}
          {brief.unansweredCount > 0 && <span className="text-slate-500"> · {brief.unansweredCount} unanswered</span>}
          {brief.retriesServed > 0 && (
            <span className="text-slate-500">
              {" "}
              · {brief.retriesServed} easier {brief.retriesServed === 1 ? "retry" : "retries"} ({brief.retriesCorrect} correct)
            </span>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Relevant Concepts</h2>
        {stepIndexes.map((stepIndex) => (
          <div key={stepIndex} className="flex flex-col gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            {brief.results
              .filter((result) => result.stepIndex === stepIndex)
              .map((result) => (
                <ResultItem key={result.probeId} result={result} />
              ))}
          </div>
        ))}
        {brief.notReachedConcepts.length > 0 && (
          <p className="text-xs text-slate-500">
            Not reached before submitting: {brief.notReachedConcepts.join(", ")}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-800">Observed strengths</h3>
          {brief.strengths.length === 0 && <p className="text-xs text-emerald-700">Not enough evidence.</p>}
          <ul className="flex flex-col gap-2">
            {brief.strengths.map((s, i) => (
              <li key={i}>
                <MathText text={s.observation} className="text-sm text-emerald-800" />
                <MathText text={s.evidence} className="text-xs text-emerald-700" />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Possible gaps</h3>
          {brief.possibleGaps.length === 0 && <p className="text-xs text-amber-700">Not enough evidence.</p>}
          <ul className="flex flex-col gap-2">
            {brief.possibleGaps.map((g, i) => (
              <li key={i}>
                <MathText text={g.observation} className="text-sm text-amber-800" />
                <MathText text={g.evidence} className="text-xs text-amber-700" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {workspace.whiteboardAsset && (
        <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Whiteboard observations</h2>
          <ul className="list-inside list-disc">
            {brief.whiteboardObservations.map((obs, i) => (
              <li key={i}>
                <MathText text={obs} className="inline text-sm text-slate-700" />
              </li>
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
        <MathText text={brief.gradeAssessment} className="text-sm text-blue-800" />
        <h3 className="mt-3 mb-1 text-sm font-semibold text-blue-800">Suggested starting point</h3>
        <MathText text={brief.suggestedStartingPoint} className="text-sm text-blue-800" />
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
