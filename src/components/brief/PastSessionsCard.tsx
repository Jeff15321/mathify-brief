'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { fetchBriefHistory } from '@/client/workspace';
import type { BriefHistory } from '@/contracts/brief';
import { MathText } from '@/components/shared/MathText';

const MONTH_DAY = /^[A-Z][a-z]{2} \d{1,2}(?:(?:,| and|, and) [A-Z][a-z]{2} \d{1,2})*$/;

/** Pulls a trailing "(Sep 26 and Oct 3)" off a history bullet so the dates can sit on their own line. */
function splitCitation(bullet: string): { note: string; when: string | null } {
  const match = bullet.match(/^(.*)\s+\(([^)]+)\)\.?$/);
  if (!match || !MONTH_DAY.test(match[2])) return { note: bullet, when: null };
  return { note: match[1], when: match[2] };
}

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

  return <section aria-labelledby="past-sessions-title" className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 id="past-sessions-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4 text-slate-400" aria-hidden /> Relevant from past sessions</h2>
      <Link href="/profile" className="shrink-0 text-xs text-slate-500 hover:text-blue-700 hover:underline">View learner profile</Link>
    </div>
    <ul className="mt-3 flex flex-col gap-3">
      {history.bullets.map((bullet, i) => {
        const { note, when } = splitCitation(bullet);
        return <li key={i} className="border-l-2 border-slate-200 pl-3">
          <MathText text={note} className="text-sm leading-5 text-slate-800" />
          {when && <p className="mt-0.5 text-xs text-slate-400">{when}</p>}
        </li>;
      })}
    </ul>
  </section>;
}
