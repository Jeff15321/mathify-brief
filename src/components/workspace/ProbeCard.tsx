import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { MathText } from "@/components/shared/MathText";
import type { ProbeAnswer, PublicProbe } from "@/types/domain";

/**
 * One multiple-choice probe: the generated options A-D followed by an "I don't know" choice,
 * and a Next button that confirms the selection. "I don't know" looks like any other option;
 * its meaning is handled by backend scoring. A collapsible hint is shown below the question.
 * @param saving - True while the answer is being saved; shows "Saving…" on the button.
 * @param disabled - Disables Next for reasons outside the card (e.g. the brief is submitting).
 */
export function ProbeCard({
  probe,
  index,
  selected,
  onSelect,
  onNext,
  saving = false,
  disabled = false,
}: {
  probe: PublicProbe;
  index: number;
  selected: ProbeAnswer | undefined;
  onSelect: (answer: ProbeAnswer) => void;
  onNext: () => void;
  saving?: boolean;
  disabled?: boolean;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const choices: { id: ProbeAnswer; textMarkdown: string }[] = [
    ...probe.options,
    { id: "IDK", textMarkdown: "I don't know" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Question {index + 1}
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
          {probe.concept}
        </span>
      </div>
      <MathText text={probe.questionMarkdown} className="text-sm leading-relaxed text-slate-800" />
      <button
        type="button"
        onClick={() => setHintOpen((open) => !open)}
        className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
      >
        <Lightbulb size={14} aria-hidden="true" />
        {hintOpen ? "Hide hint" : "Show hint"}
      </button>
      {hintOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm italic text-amber-800">
          {probe.hint}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <label
            key={choice.id}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              selected === choice.id
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name={probe.id}
              value={choice.id}
              checked={selected === choice.id}
              onChange={() => onSelect(choice.id)}
              className="mt-1 accent-blue-600"
            />
            <MathText text={choice.textMarkdown} />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!selected || saving || disabled}
        className="self-end rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Next"}
      </button>
    </div>
  );
}
