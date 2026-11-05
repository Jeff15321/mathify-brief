import Link from "next/link";
import type { PublicWorkspace, TutorBrief } from "@/types/domain";
import { BriefHeader } from "./BriefHeader";
import { CurrentQuestionCard } from "./CurrentQuestionCard";
import { ProbeEvidenceCard } from "./ProbeEvidenceCard";
import { ConceptListCard } from "./ConceptListCard";
import { PriorityStepCard } from "./PriorityStepCard";
import { WhiteboardPreviewCard } from "./WhiteboardPreviewCard";
import { ProbingResultsAccordion } from "./ProbingResultsAccordion";

/** Recommendation first, with supporting work available on demand. */
export function TutorBriefView({ workspace, brief }: { workspace: PublicWorkspace; brief: TutorBrief }) {
  const analysis = workspace.analysis!;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 sm:p-6">
      <BriefHeader
        studentGrade={workspace.profile.grade}
        questionGrade={analysis.estimatedQuestionGrade}
        gradeDifficulty={analysis.gradeDifficulty}
        topic={analysis.topic}
      />
      <PriorityStepCard results={brief.results} priorityStepIndex={brief.priorityStepIndex} notReachedConcepts={brief.notReachedConcepts} />
      <ProbeEvidenceCard core={brief.core} retries={brief.retries} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptListCard tone="strength" concepts={brief.strengths} />
        <ConceptListCard tone="gap" concepts={brief.gaps} />
      </div>
      <p className="text-xs text-slate-500">
        Strengths and possible gaps reflect main questions. A correct easier retry does not clear a possible gap.
      </p>
      <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer p-4 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600">
          Question &amp; student work
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Original question{workspace.attachments.length > 0 ? ` · ${workspace.attachments.length} uploaded files` : ""}
            {workspace.whiteboardAsset ? " · Whiteboard available" : " · No whiteboard submitted"}
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4">
          <CurrentQuestionCard
            parsedQuestionMarkdown={analysis.parsedQuestionMarkdown}
            questionText={workspace.questionText}
            attachments={workspace.attachments}
          />
          <WhiteboardPreviewCard assetId={workspace.whiteboardAsset?.id ?? null} />
        </div>
      </details>
      <ProbingResultsAccordion results={brief.results} notReachedConcepts={brief.notReachedConcepts} />
      <Link
        href="/"
        className="self-start rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Start a new question
      </Link>
    </div>
  );
}
