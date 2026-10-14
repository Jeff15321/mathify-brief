"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, fetchWorkspace, submitBrief } from "@/lib/api-client";
import type { PublicWorkspace, ProbeAnswers } from "@/types/domain";
import { ThreePanelLayout } from "@/components/workspace/ThreePanelLayout";
import { WhiteboardPanel } from "@/components/workspace/WhiteboardPanel";
import { ProbingPanel } from "@/components/workspace/ProbingPanel";
import { BreakdownPanel } from "@/components/workspace/BreakdownPanel";
import type { SimpleWhiteboardHandle } from "@/components/whiteboard/SimpleWhiteboard";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { LoadingState } from "@/components/shared/LoadingState";

export default function WorkspacePage() {
  const router = useRouter();
  const whiteboardRef = useRef<SimpleWhiteboardHandle>(null);
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [answers, setAnswers] = useState<ProbeAnswers>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspace()
      .then((ws) => {
        if (cancelled) return;
        if (!ws || !ws.analysis) {
          router.replace("/");
          return;
        }
        if (ws.brief) {
          router.replace("/brief");
          return;
        }
        setWorkspace(ws);
        setAnswers(ws.answers);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleAnswer(probeId: string, optionId: "A" | "B" | "C" | "D") {
    setAnswers((prev) => ({ ...prev, [probeId]: optionId }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const whiteboardPng = (await whiteboardRef.current?.exportPng()) ?? null;
      await submitBrief(answers, whiteboardPng);
      router.push("/brief");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Could not submit your answers. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (loading || !workspace || !workspace.analysis) {
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
              probes={workspace.analysis.probingQuestions}
              answers={answers}
              onAnswer={handleAnswer}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          }
          breakdown={
            <BreakdownPanel
              analysis={workspace.analysis}
              questionText={workspace.questionText}
              attachments={workspace.attachments}
            />
          }
        />
      </div>
    </div>
  );
}
