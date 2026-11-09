import { MathText } from '@/components/shared/MathText';
import type { StoredAsset } from '@/types/domain';
/** Keep every original source accessible in the first view, even without a board export. */
export function CurrentQuestionCard({ parsedQuestionMarkdown, questionText, attachments }: {
  parsedQuestionMarkdown: string; questionText: string; attachments: StoredAsset[];
}) {
  return <section aria-labelledby="original-problem-title" className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
    <h2 id="original-problem-title" className="text-sm font-semibold text-slate-900">Original problem</h2>
    <MathText text={questionText || parsedQuestionMarkdown} className="text-sm text-slate-900 break-words" />
    {!questionText && <p className="text-xs text-slate-500">Transcribed from the sources below.</p>}
    <ul className="grid grid-cols-2 gap-2">{attachments.map((asset, index) => <li key={asset.id}>
      <a href={`/api/assets/${asset.id}`} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-slate-200 p-2 text-xs text-blue-700 underline">
        {asset.mimeType !== 'application/pdf' &&
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/assets/${asset.id}`} alt={`Problem source ${index + 1}`} className="mb-2 h-28 w-full object-contain" />}
        <span className="break-all">{asset.fileName}{asset.mimeType === 'application/pdf' ? ' (PDF)' : ''}</span>
      </a>
    </li>)}</ul>
  </section>;
}
