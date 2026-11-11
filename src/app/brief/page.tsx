"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWorkspace } from "@/lib/api-client";
import type { PublicWorkspace } from "@/types/domain";
import { TutorBriefView } from "@/components/brief/TutorBriefView";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { recordPilotEvent } from "@/lib/measurement";
import { LoadingState } from "@/components/shared/LoadingState";

export default function BriefPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspace()
      .then((ws) => {
        if (cancelled) return;
        if (!ws) {
          router.replace("/");
          return;
        }
        if (!ws.brief) {
          router.replace(ws.analysis ? "/workspace" : "/");
          return;
        }
        setError(null);
        setWorkspace(ws);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setError("Your report could not be loaded. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  useEffect(() => {
    if (!workspace?.brief) return;
    let cancelled = false;
    let ready = false;
    let recorded = false;
    const announce = () => {
      if (cancelled || !ready || recorded || document.visibilityState !== 'visible') return;
      recorded = true;
      recordPilotEvent('brief_visible', { attemptId: workspace.draftId, workspaceId: workspace.workspaceId, mode: workspace.generationMode, promptVersion: workspace.promptVersion }, { coreAnswered: workspace.brief!.core.attempted, corePlanned: workspace.brief!.core.total });
    };
    void Promise.all([document.fonts.ready, ...Array.from(document.images).map(img => img.decode())]).then(() => { ready = true; announce(); }).catch(() => {});
    document.addEventListener('visibilitychange', announce);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', announce); };
  }, [workspace]);

  if (loading || !workspace || !workspace.brief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        {error ? <ErrorBanner message={error} onRetry={() => setAttempt(n => n + 1)} /> : <LoadingState label="Loading your Tutor Brief…" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TutorBriefView workspace={workspace} brief={workspace.brief} />
    </div>
  );
}
