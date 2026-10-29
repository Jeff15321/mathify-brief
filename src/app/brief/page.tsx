"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWorkspace } from "@/lib/api-client";
import type { PublicWorkspace } from "@/types/domain";
import { TutorBriefView } from "@/components/brief/TutorBriefView";
import { BriefLayout } from "@/components/brief/BriefLayout";
import { LoadingState } from "@/components/shared/LoadingState";

export default function BriefPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
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
        setWorkspace(ws);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !workspace || !workspace.brief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState label="Loading your Tutor Brief…" />
      </div>
    );
  }

  return (
    <BriefLayout
      whiteboardAssetId={workspace.whiteboardAsset?.id ?? null}
      attachments={workspace.attachments}
      whiteboard={null}
      report={<TutorBriefView workspace={workspace} brief={workspace.brief} />}
    />
  );
}
