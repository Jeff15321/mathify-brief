import Link from "next/link";
import type { PublicWorkspace, TutorBrief } from "@/types/domain";
import { BriefHeader } from "./BriefHeader";
import { CurrentQuestionCard } from "./CurrentQuestionCard";
import { ProbeTallyCard } from "./ProbeTallyCard";
import { ConceptListCard } from "./ConceptListCard";
import { PriorityStepCard } from "./PriorityStepCard";
import { WhiteboardPreviewCard } from "./WhiteboardPreviewCard";
import { ProbingResultsAccordion } from "./ProbingResultsAccordion";

/**
 * Tutor Brief dashboard, laid out to be skimmed in seconds: the most important cards come first
 * (tallies, strengths/gaps, the priority step), with full details collapsed at the bottom.
 */
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
      <CurrentQuestionCard
        parsedQuestionMarkdown={analysis.parsedQuestionMarkdown}
        questionText={workspace.questionText}
        attachments={workspace.attachments}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ProbeTallyCard title="Core probes" tally={brief.core} emptyLabel="No core probes." />
        <ProbeTallyCard title="Easier retries" tally={brief.retries} emptyLabel="No retries needed." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptListCard tone="strength" concepts={brief.strengths} />
        <ConceptListCard tone="gap" concepts={brief.gaps} />
      </div>
      <PriorityStepCard results={brief.results} priorityStepIndex={brief.priorityStepIndex} />
      <WhiteboardPreviewCard assetId={workspace.whiteboardAsset?.id ?? null} />
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
