import { StartingPointCard } from "./StartingPointCard";
import { EvidenceSummary } from "./EvidenceSummary";
import Link from "next/link";
import { TutorFeedbackSurvey } from "./TutorFeedbackSurvey";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-3 p-4 sm:p-6">
      <BriefHeader
        studentGrade={workspace.profile.grade}
        questionGrade={analysis.estimatedQuestionGrade}
        gradeDifficulty={analysis.gradeDifficulty}
        topic={analysis.topic}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <CurrentQuestionCard parsedQuestionMarkdown={analysis.parsedQuestionMarkdown} questionText={workspace.questionText} attachments={workspace.attachments} />
          <WhiteboardPreviewCard assetId={workspace.whiteboardAsset?.id ?? null} />
        </div>
        <div className="space-y-3">
          <StartingPointCard brief={brief} />
          <EvidenceSummary brief={brief} drawingOmitted={workspace.whiteboardState === 'omitted'} />
        </div>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Counts and additional concepts</summary>
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProbeTallyCard title="Core probes" tally={brief.core} emptyLabel="No core probes." />
            <ProbeTallyCard title="Easier retries" tally={brief.retries} emptyLabel="No retries recorded." />
            <ConceptListCard tone="strength" concepts={brief.strengths} />
            <ConceptListCard tone="gap" concepts={brief.gaps} />
          </div>
          <PriorityStepCard results={brief.results} priorityStepIndex={brief.priorityStepIndex} />
        </div>
      </details>
      <ProbingResultsAccordion results={brief.results} notReachedConcepts={brief.notReachedConcepts} />
      {workspace.feedbackReportId && <TutorFeedbackSurvey reportId={workspace.feedbackReportId} />}
      <Link
        href="/workspace?new=1"
        className="self-start rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Start a new question
      </Link>
    </div>
  );
}
