import { useEffect } from 'react';
import { recordPilotEvent } from '@/client/measurement';
import { ChevronDown } from "lucide-react";
import { StartingPointCard } from "./StartingPointCard";
import { EvidenceSummary } from "./EvidenceSummary";
import { PastSessionsCard } from "./PastSessionsCard";
import type { PublicWorkspace } from "@/contracts/workspace";
import type { TutorBrief } from "@/contracts/brief";
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
  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let recorded = false;
    const announce = () => {
      if (cancelled || !ready || recorded || document.visibilityState !== 'visible') return;
      recorded = true;
      recordPilotEvent('brief_visible', { attemptId: workspace.draftId, workspaceId: workspace.workspaceId, mode: workspace.generationMode, promptVersion: workspace.promptVersion }, { coreAnswered: brief.core.attempted, corePlanned: brief.core.total });
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    void Promise.all([fontsReady, ...Array.from(document.images).map(img => img.decode())]).then(() => { ready = true; announce(); }).catch(() => {});
    document.addEventListener('visibilitychange', announce);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', announce); };
  }, [workspace, brief]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-12">
      <div className="flex items-start justify-between gap-4">
        <BriefHeader
          studentGrade={workspace.profile.grade}
          questionGrade={analysis.estimatedQuestionGrade}
          gradeDifficulty={analysis.gradeDifficulty}
          topic={analysis.topic}
        />
        <a
          href="/workspace?new=1"
          className="mt-1 shrink-0 rounded-panel border border-connector bg-card px-3 py-1.5 text-sm font-bold text-ink hover:bg-ground"
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
      <details className="group rounded-card border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-ink">Counts and additional concepts</span>
            <span className="text-sm text-muted">Core checks, retries, strengths, and gaps</span>
          </span>
          <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-3 border-t border-line p-4">
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
