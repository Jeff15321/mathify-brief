'use client';
import { Fragment, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { BriefCard } from '@/components/brief/BriefCard';

const PREVIEW_LINES = 15;
const PREVIEW_CHARS = 1200;
// Optional `[HH:MM:SS]` then one or two capitalized words and a colon, e.g. "[00:01:12] Student: 18."
const SPEAKER = /^(\[[\d:.,]+\]\s*)?([A-Z][\w.'-]*(?: [A-Z][\w.'-]*)?:)(?=\s|$)/;

function TranscriptLine({ line }: { line: string }) {
  const match = line.match(SPEAKER);
  if (!match) return line;
  return <>
    {match[1] && <span className="text-slate-400">{match[1]}</span>}
    <strong className="font-semibold text-slate-900">{match[2]}</strong>
    {line.slice(match[0].length)}
  </>;
}

/** Plain-text transcript card, collapsed to a short preview until expanded. */
export function TranscriptViewer({ text, fileName }: { text: string; fileName: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.trimEnd().split(/\r?\n/);
  const preview = lines.slice(0, PREVIEW_LINES).join('\n').slice(0, PREVIEW_CHARS);
  const collapsible = preview.length < lines.join('\n').length;
  const shown = expanded || !collapsible ? lines : preview.split('\n');

  return <BriefCard title="Transcript" icon={<ScrollText className="h-4 w-4 text-slate-500" aria-hidden />} badge={<span className="truncate text-xs text-slate-500">{fileName}</span>}>
    <div className="relative">
      <pre data-testid="transcript" className="overflow-x-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
        {shown.map((line, i) => <Fragment key={i}>{i > 0 && '\n'}<TranscriptLine line={line} /></Fragment>)}
      </pre>
      {collapsible && !expanded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-white" />}
    </div>
    {collapsible && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
      className="self-start rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
      {expanded ? 'Collapse' : `Show full transcript (${lines.length} lines)`}
    </button>}
  </BriefCard>;
}
