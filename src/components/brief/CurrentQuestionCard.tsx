"use client";

import { useState } from "react";
import { MathText } from "@/components/shared/MathText";
import { QuestionDisplay } from "@/components/workspace/QuestionDisplay";
import type { StoredAsset } from "@/types/domain";
import { BriefCard } from "./BriefCard";

/** The parsed question, with a toggle that reveals the original text and uploaded files. */
export function CurrentQuestionCard({
  parsedQuestionMarkdown,
  questionText,
  attachments,
}: {
  parsedQuestionMarkdown: string;
  questionText: string;
  attachments: StoredAsset[];
}) {
  const [showFull, setShowFull] = useState(false);

  return (
    <BriefCard>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current question</span>
      <MathText text={parsedQuestionMarkdown} className="text-sm text-slate-900" />
      <p className="text-xs text-slate-500">
        {attachments.length > 0 && "Original upload available · "}
        <button
          type="button"
          onClick={() => setShowFull((open) => !open)}
          aria-expanded={showFull}
          className="font-medium text-blue-700 underline"
        >
          {showFull ? "Hide full question" : "View full question"}
        </button>
      </p>
      {showFull && (
        <QuestionDisplay
          questionText={questionText}
          parsedQuestionMarkdown={parsedQuestionMarkdown}
          attachments={attachments}
        />
      )}
    </BriefCard>
  );
}
