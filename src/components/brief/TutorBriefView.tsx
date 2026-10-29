import Link from "next/link";
import type { PublicWorkspace, TutorBrief } from "@/types/domain";
import { BriefHeader } from "./BriefHeader";
import { CurrentQuestionCard } from "./CurrentQuestionCard";
import { ProbeTallyCard } from "./ProbeTallyCard";
import { ConceptListCard } from "./ConceptListCard";
import { PriorityStepCard } from "./PriorityStepCard";
import { ProbingResultsAccordion } from "./ProbingResultsAccordion";
import { ConfidenceCard } from "./ConfidenceCard";
import { TutorFeedbackForm } from "./TutorFeedbackForm";

/**
 * Tutor Brief dashboard, laid out for quick scanning by a tutor about to start
 * a session. Strengths/gaps and priority first, then tallies, then details.
 * The whiteboard is always visible on the left side of BriefLayout, so
 * WhiteboardPreviewCard is not rendered here.
 */
export function TutorBriefView({ workspace, brief }: { workspace: PublicWorkspace; brief: TutorBrief }) {
  const analysis = workspace.analysis!;

  return (
    <div className="flex flex-col gap-3">
      <BriefHeader
        studentGrade={workspace.profile.grade}
        questionGrade={analysis.estimatedQuestionGrade}
        gradeDifficulty={analysis.gradeDifficulty}
        topic={analysis.topic}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ConceptListCard tone="strength" concepts={brief.strengths} />
        <ConceptListCard tone="gap" concepts={brief.gaps} />
      </div>
      <PriorityStepCard results={brief.results} priorityStepIndex={brief.priorityStepIndex} />
      <ConfidenceCard confidence={brief.confidence} factors={brief.confidenceFactors} earlyExit={brief.earlyExit} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ProbeTallyCard title="Core probes" tally={brief.core} emptyLabel="No core probes." />
        <ProbeTallyCard title="Easier retries" tally={brief.retries} emptyLabel="No retries needed." />
      </div>
      <CurrentQuestionCard
        parsedQuestionMarkdown={analysis.parsedQuestionMarkdown}
        questionText={workspace.questionText}
        attachments={workspace.attachments}
      />
      <ProbingResultsAccordion results={brief.results} notReachedConcepts={brief.notReachedConcepts} />
      <TutorFeedbackForm />
      <Link
        href="/"
        className="self-start rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Start a new question
      </Link>
    </div>
  );
}
