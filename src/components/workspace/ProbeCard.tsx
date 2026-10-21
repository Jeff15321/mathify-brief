import { MathText } from "@/components/shared/MathText";
import type { ProbeAnswer, PublicProbe } from "@/types/domain";

/** One multiple-choice probe with options A-D plus a separate "I don't know" choice. */
export function ProbeCard({
  probe,
  index,
  selected,
  onSelect,
}: {
  probe: PublicProbe;
  index: number;
  selected: ProbeAnswer | undefined;
  onSelect: (answer: ProbeAnswer) => void;
}) {
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
      <div className="flex flex-col gap-2">
        {probe.options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              selected === option.id
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name={probe.id}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
              className="mt-1 accent-blue-600"
            />
            <MathText text={option.textMarkdown} />
          </label>
        ))}
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm ${
            selected === "IDK"
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <input
            type="radio"
            name={probe.id}
            value="IDK"
            checked={selected === "IDK"}
            onChange={() => onSelect("IDK")}
            className="accent-amber-600"
          />
          I don&apos;t know
        </label>
      </div>
    </div>
  );
}
