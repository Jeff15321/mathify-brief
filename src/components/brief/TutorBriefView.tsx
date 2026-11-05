import Link from "next/link";
import type { PublicWorkspace, TutorBrief } from "@/types/domain";
import { GRADE_DIFFICULTY_LABEL } from "@/lib/grade-difficulty";
import { BriefHeader } from "./BriefHeader";
import { CurrentQuestionCard } from "./CurrentQuestionCard";
import { ConceptChecks } from "./ConceptChecks";

/** Subject and observed responses first; source material remains secondary. */
export function TutorBriefView({ workspace, brief }: { workspace: PublicWorkspace; brief: TutorBrief }) {
  const analysis = workspace.analysis!;
  const mainResults = brief.results.filter((r) => r.kind === "main");
  const simpler = brief.results.filter((r) => r.kind === "easier");
  const answered = mainResults.filter((r) => r.outcome !== "unanswered").length;
  const shownUnanswered = mainResults.length - answered;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 pb-8 [overflow-wrap:anywhere] sm:p-8 xl:px-10 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
      <BriefHeader studentGrade={workspace.profile.grade} topic={analysis.topic} />
      <p className="-mt-2 text-sm text-slate-500">
        {answered} of {mainResults.length + brief.notReachedConcepts.length} main questions answered
        {simpler.length > 0 && ` · ${simpler.filter((r) => r.outcome !== "unanswered").length} of ${simpler.length} simpler questions answered`}
        {shownUnanswered > 0 && ` · ${shownUnanswered} shown but unanswered`}
        {brief.notReachedConcepts.length > 0 && ` · ${brief.notReachedConcepts.length} not reached`}
      </p>
      <ConceptChecks results={brief.results} notReachedConcepts={brief.notReachedConcepts} />
      <div>
        <CurrentQuestionCard
          parsedQuestionMarkdown={analysis.parsedQuestionMarkdown}
          questionText={workspace.questionText}
          attachments={workspace.attachments}
          whiteboardAsset={workspace.whiteboardAsset}
        />
        <details className="border-t border-slate-200">
          <summary className="cursor-pointer py-3 text-sm font-medium text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">Report details</summary>
          <div className="space-y-3 pb-4">
          <dl className="space-y-2 text-xs text-slate-600">
            {([["Main questions", brief.core], ["Simpler follow-ups", brief.retries]] as const).map(([label, tally]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd>{tally.correct} correct · {tally.incorrect} incorrect · {tally.dontKnow} unsure · {tally.total - tally.attempted} unattempted ({tally.attempted} of {tally.total} attempted)</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">AI-estimated question level: {analysis.estimatedQuestionGrade} · {GRADE_DIFFICULTY_LABEL[analysis.gradeDifficulty]} · {analysis.topic}</p>
          </div>
        </details>
        <div className="border-t border-slate-200 pt-3">
          <Link href="/" className="text-sm text-slate-500 underline underline-offset-4 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">Start a new question</Link>
        </div>
      </div>
    </div>
  );
}
