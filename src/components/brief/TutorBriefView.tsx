import { ChevronDown } from "lucide-react";
import { StartingPointCard } from "./StartingPointCard";
import { EvidenceSummary } from "./EvidenceSummary";
import { PastSessionsCard } from "./PastSessionsCard";
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
      <div className="flex items-start justify-between gap-4">
        <BriefHeader
          studentGrade={workspace.profile.grade}
          questionGrade={analysis.estimatedQuestionGrade}
          gradeDifficulty={analysis.gradeDifficulty}
          topic={analysis.topic}
        />
        <a
          href="/workspace?new=1"
          className="mt-1 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          New question
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <CurrentQuestionCard parsedQuestionMarkdown={analysis.parsedQuestionMarkdown} questionText={workspace.questionText} attachments={workspace.attachments} />
          <WhiteboardPreviewCard assetId={workspace.whiteboardAsset?.id ?? null} />
        </div>
        <div className="space-y-3">
          <StartingPointCard brief={brief} />
          <EvidenceSummary brief={brief} drawingOmitted={workspace.whiteboardState === 'omitted'} />
        </div>
      </div>
      <PastSessionsCard workspaceId={workspace.workspaceId} />
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-slate-900">Counts and additional concepts</span>
            <span className="text-xs text-slate-500">Core checks, retries, strengths, and gaps</span>
          </span>
          <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-4">
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
    </div>
  );
}
