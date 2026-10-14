"use client";

import { useState } from "react";
import type { StoredAsset } from "@/types/domain";
import { MathText } from "@/components/shared/MathText";

function AttachmentPreview({ asset }: { asset: StoredAsset }) {
  const url = `/api/assets/${asset.id}`;
  if (asset.mimeType === "application/pdf") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-700 underline"
      >
        Open {asset.fileName} (PDF)
      </a>
    );
  }
  // Width always matches the panel (w-full); height is "auto" so the browser derives it from
  // the image's own intrinsic aspect ratio - never stretched/distorted, and it reflows
  // correctly whenever the panel itself resizes (e.g. on expand/restore).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={asset.fileName} className="block w-full h-auto rounded-lg border border-slate-200" />;
}

export function QuestionDisplay({
  questionText,
  parsedQuestionMarkdown,
  attachments,
}: {
  questionText: string;
  parsedQuestionMarkdown: string;
  attachments: StoredAsset[];
}) {
  const [tab, setTab] = useState<"parsed" | "original">("parsed");
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("parsed")}
          className={`flex-1 rounded-full px-3 py-1 ${tab === "parsed" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
        >
          Parsed
        </button>
        <button
          type="button"
          onClick={() => setTab("original")}
          className={`flex-1 rounded-full px-3 py-1 ${tab === "original" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
        >
          Original
        </button>
      </div>

      {tab === "parsed" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <MathText text={parsedQuestionMarkdown} className="text-sm leading-relaxed text-slate-800" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questionText && <p className="whitespace-pre-wrap text-sm text-slate-700">{questionText}</p>}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-wrap gap-2 text-xs">
                {attachments.map((asset, index) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => setActiveAssetIndex(index)}
                      className={`rounded-full border px-2 py-1 ${
                        activeAssetIndex === index
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-300 text-slate-600"
                      }`}
                    >
                      {asset.fileName}
                    </button>
                  </li>
                ))}
              </ul>
              <AttachmentPreview asset={attachments[activeAssetIndex]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
