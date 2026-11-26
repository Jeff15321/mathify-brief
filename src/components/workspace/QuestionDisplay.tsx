"use client";

import { useState } from "react";
import type { StoredAsset } from "@/contracts/assets";
import { MathText } from "@/components/shared/MathText";

function AttachmentPreview({ asset }: { asset: StoredAsset }) {
  const url = `/api/assets/${asset.id}`;
  if (asset.mimeType === "application/pdf") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-pink-deep underline"
      >
        Open {asset.fileName} (PDF)
      </a>
    );
  }
  // Width always matches the panel (w-full); height is "auto" so the browser derives it from
  // the image's own intrinsic aspect ratio - never stretched/distorted, and it reflows
  // correctly whenever the panel itself resizes (e.g. on expand/restore).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={asset.fileName} className="block w-full h-auto rounded-panel border border-line" />;
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
  const [tab, setTab] = useState<"parsed" | "original">("original");
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex gap-1 rounded-full bg-fill p-1 text-sm font-semibold">
        <button
          type="button"
          aria-pressed={tab === "original"} onClick={() => setTab("original")}
          className={`flex-1 rounded-full px-3 py-1 ${tab === "original" ? "bg-card text-pink-deep" : "text-muted"}`}
        >
          Original
        </button>
        <button
          type="button"
          aria-pressed={tab === "parsed"} onClick={() => setTab("parsed")}
          className={`flex-1 rounded-full px-3 py-1 ${tab === "parsed" ? "bg-card text-pink-deep" : "text-muted"}`}
        >
          Interpreted
        </button>
      </div>

      {tab === "parsed" ? (
        <div className="rounded-panel border border-line bg-card p-3">
          <MathText text={parsedQuestionMarkdown} className="overflow-x-auto text-sm leading-relaxed text-ink" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questionText && <p className="whitespace-pre-wrap wrap-anywhere text-sm text-ink">{questionText}</p>}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-wrap gap-2 text-sm">
                {attachments.map((asset, index) => (
                  <li key={asset.id} className="min-w-0 max-w-full">
                    <button
                      type="button"
                      onClick={() => setActiveAssetIndex(index)}
                      className={`max-w-full wrap-anywhere rounded-panel border px-2 py-1 ${
                        activeAssetIndex === index
                          ? "border-pink bg-wash text-ink"
                          : "border-connector text-muted"
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
