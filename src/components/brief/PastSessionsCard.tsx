'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { fetchBriefHistory } from '@/lib/api-client';
import type { BriefHistory } from '@/types/domain';
import { MathText } from '@/components/shared/MathText';

/** Loads after the brief renders; shows nothing when no past session is relevant or the call failed. */
export function PastSessionsCard({ workspaceId }: { workspaceId: string }) {
  const [history, setHistory] = useState<BriefHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBriefHistory(workspaceId)
      .then(next => { if (!cancelled) setHistory(next); }, () => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (loading) return <div role="status" className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs text-slate-500">Checking past sessions…</p>
    <div aria-hidden className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
  </div>;
  if (history?.status !== 'ready' || history.bullets.length === 0) return null;

  return <section aria-labelledby="past-sessions-title" className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h2 id="past-sessions-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4 text-slate-500" aria-hidden /> Relevant from past sessions</h2>
      <Link href="/profile" className="shrink-0 text-xs font-medium text-blue-700 hover:underline">View learner profile</Link>
    </div>
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
      {history.bullets.map((bullet, i) => <li key={i}><MathText text={bullet} /></li>)}
    </ul>
  </section>;
}
