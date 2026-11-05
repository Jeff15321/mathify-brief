import { MathText } from "@/components/shared/MathText";
import type { StoredAsset } from "@/types/domain";

/** Original problem and submitted work share one direct disclosure. */
export function CurrentQuestionCard({
  parsedQuestionMarkdown, questionText, attachments, whiteboardAsset,
}: {
  parsedQuestionMarkdown: string;
  questionText: string;
  attachments: StoredAsset[];
  whiteboardAsset: StoredAsset | null;
}) {
  return (
    <details className="border-t border-slate-200">
      <summary className="cursor-pointer py-3 text-sm font-medium text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">Original problem &amp; student work</summary>
      <div className="space-y-3 pb-4">
        <h2 id="original-question-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {questionText.trim() ? "Original problem" : "Problem · transcribed from upload"}
        </h2>
        <div className="max-h-48 overflow-auto rounded-sm focus-visible:outline-2 focus-visible:outline-blue-600" tabIndex={0} role="region" aria-label="Problem text">
          <MathText text={questionText.trim() || parsedQuestionMarkdown} className="text-lg leading-relaxed text-slate-900" />
        </div>
        {whiteboardAsset || attachments.length > 0 ? (
          <div className="space-y-4">
              {whiteboardAsset && <AssetPreview asset={whiteboardAsset} label="Student's whiteboard" />}
              {attachments.map((asset) => <AssetPreview key={asset.id} asset={asset} label={asset.fileName} />)}
          </div>
        ) : <p className="text-xs text-slate-500">No student work or files submitted.</p>}
      </div>
    </details>
  );
}

function AssetPreview({ asset, label }: { asset: StoredAsset; label: string }) {
  const url = `/api/assets/${asset.id}`;
  return (
    <figure className="space-y-2">
      <figcaption>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-blue-600">{label} · open original</a>
      </figcaption>
      {asset.mimeType.startsWith("image/") && (
        // Uploaded images have no stored dimensions. A fixed preview box prevents layout shifts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} loading="lazy" className="h-64 w-full rounded-lg border border-slate-200 bg-white object-contain" />
      )}
    </figure>
  );
}
