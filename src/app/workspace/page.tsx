"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, answerProbe, fetchWorkspace, generateNextProbes, submitBrief } from "@/lib/api-client";
import type { ProbeAnswer, PublicProbing, PublicWorkspace } from "@/types/domain";
import { ThreePanelLayout } from "@/components/workspace/ThreePanelLayout";
import { WhiteboardPanel } from "@/components/workspace/WhiteboardPanel";
import { ProbingPanel } from "@/components/workspace/ProbingPanel";
import { BreakdownPanel } from "@/components/workspace/BreakdownPanel";
import type { SimpleWhiteboardHandle } from "@/components/whiteboard/SimpleWhiteboard";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { LoadingState } from "@/components/shared/LoadingState";

/** How often to re-check a step another request is generating (e.g. after a page refresh). */
const WAITING_POLL_MS = 1500;

export default function WorkspacePage() {
  const router = useRouter();
  const whiteboardRef = useRef<SimpleWhiteboardHandle>(null);
  const prefetchRef = useRef<Promise<void> | null>(null);
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [probing, setProbing] = useState<PublicProbing | null>(null);
  const [selection, setSelection] = useState<ProbeAnswer | undefined>(undefined);
  const [answering, setAnswering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Keeps the newest server state; responses can arrive out of order, so older revisions are ignored. */
  const applyProbing = useCallback((next: PublicProbing) => {
    setProbing((prev) => (!prev || next.revision >= prev.revision ? next : prev));
  }, []);

  const refreshProbing = useCallback(async () => {
    const ws = await fetchWorkspace().catch(() => null);
    if (ws?.probing) applyProbing(ws.probing);
  }, [applyProbing]);

  /** Fills the buffer (next step's pair) in the background; concurrent callers share one request. */
  const prefetch = useCallback((): Promise<void> => {
    if (prefetchRef.current) return prefetchRef.current;
    const run = (async () => {
      try {
        let next = await generateNextProbes();
        applyProbing(next);
        // The cursor may have moved while generating; top the buffer up once more if needed.
        if (next.needsPrefetch) {
          next = await generateNextProbes();
          applyProbing(next);
        }
      } catch {
        // The failed step is marked server-side; refresh so the panel can offer a retry.
        await refreshProbing();
      } finally {
        prefetchRef.current = null;
      }
    })();
    prefetchRef.current = run;
    return run;
  }, [applyProbing, refreshProbing]);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspace()
      .then((ws) => {
        if (cancelled) return;
        if (!ws || !ws.analysis || !ws.probing) {
          router.replace("/");
          return;
        }
        if (ws.brief) {
          router.replace("/brief");
          return;
        }
        setWorkspace(ws);
        applyProbing(ws.probing);
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router, applyProbing]);

  // Keep the next pair buffered whenever the server reports a pending step in the window.
  useEffect(() => {
    if (probing?.needsPrefetch) void prefetch();
  }, [probing, prefetch]);

  // If we are waiting on a step that some other request is generating, poll until it is ready.
  useEffect(() => {
    if (!probing || probing.current || probing.waitingStatus !== "generating") return;
    const timer = setTimeout(() => {
      if (!prefetchRef.current) void refreshProbing();
    }, WAITING_POLL_MS);
    return () => clearTimeout(timer);
  }, [probing, refreshProbing]);

  async function handleNext() {
    if (!probing?.current || !selection) return;
    setAnswering(true);
    setError(null);
    try {
      applyProbing(await answerProbe(probing.current.id, selection));
      setSelection(undefined);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save your answer. Please try again.");
      await refreshProbing();
    } finally {
      setAnswering(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const whiteboardPng = (await whiteboardRef.current?.exportPng()) ?? null;
      await submitBrief(whiteboardPng);
      router.push("/brief");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Could not submit your answers. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (!workspace || !workspace.analysis || !probing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState label="Loading your workspace…" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-semibold text-slate-900">Mathify</span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          Grade {workspace.profile.grade}
        </span>
      </header>
      {error && (
        <div className="px-4 pt-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ThreePanelLayout
          whiteboard={<WhiteboardPanel ref={whiteboardRef} disabled={submitting} />}
          probing={
            <ProbingPanel
              probing={probing}
              selection={selection}
              onSelect={setSelection}
              onNext={handleNext}
              onRetry={() => void prefetch()}
              answering={answering}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          }
          breakdown={
            <BreakdownPanel
              analysis={workspace.analysis}
              studentGrade={workspace.profile.grade}
              questionText={workspace.questionText}
              attachments={workspace.attachments}
            />
          }
        />
      </div>
    </div>
  );
}
