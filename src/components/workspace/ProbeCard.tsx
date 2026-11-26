import { useEffect, useRef } from 'react';
import { MathText } from "@/components/shared/MathText";
import type { ProbeAnswer, PublicProbe } from "@/contracts/probes";

/**
 * One multiple-choice probe: the generated options A-D followed by an "I don't know" choice,
 * and a Next button that confirms the selection. "I don't know" looks like any other option;
 * its meaning is handled by backend scoring.
 * @param saving - True while the answer is being saved; shows "Saving…" on the button.
 * @param disabled - Disables Next for reasons outside the card (e.g. the brief is submitting).
 */
export function ProbeCard({
  probe,
  selected,
  onSelect,
  onNext,
  hintOpened = false, onHintOpened, onVisible,
  saving = false,
  disabled = false,
}: {
  probe: PublicProbe;
  selected: ProbeAnswer | undefined;
  onSelect: (answer: ProbeAnswer) => void;
  onNext: () => void;
  onVisible?: () => void;
  hintOpened?: boolean;
  onHintOpened?: () => void;
  saving?: boolean;
  disabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !onVisible || typeof IntersectionObserver === 'undefined') return;
    let intersects = false; let visible = false;
    const announce = () => { const next = intersects && document.visibilityState === 'visible'; if (next && !visible) onVisible(); visible = next; };
    const observer = new IntersectionObserver(entries => { intersects = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.1); announce(); }, { threshold: 0.1 });
    observer.observe(root.current); document.addEventListener('visibilitychange', announce);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', announce); };
  }, [onVisible, probe.id]);
  const choices: { id: ProbeAnswer; textMarkdown: string }[] = [
    ...probe.options,
    { id: "IDK", textMarkdown: "I don't know" },
  ];

  return (
    <div ref={root} className="flex flex-col gap-3 rounded-card border border-line bg-card p-4 sm:p-6">
      <p className="text-sm font-medium text-muted">{probe.concept}</p>
      <MathText text={probe.questionMarkdown} className="text-xl leading-relaxed text-ink" />
      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <label
            key={choice.id}
            className={`flex cursor-pointer items-start gap-2 rounded-panel border px-4 py-2.5 text-base ${
              selected === choice.id
                ? "border-pink bg-wash"
                : "border-line hover:bg-ground"
            }`}
          >
            <input
              type="radio"
              disabled={saving || disabled}
              name={probe.id}
              value={choice.id}
              checked={selected === choice.id}
              onChange={() => onSelect(choice.id)}
              className="mt-1 accent-pink"
            />
            <MathText text={choice.textMarkdown} />
          </label>
        ))}
      </div>
      {probe.hint && <div className="text-sm">
        {hintOpened ? <div className="rounded bg-wash p-3"><span className="font-semibold">Hint: </span><MathText text={probe.hint} /></div>
          : <button type="button" disabled={saving || disabled} onClick={onHintOpened} className="text-pink-deep underline">Show a hint</button>}
      </div>}
      <button
        type="button"
        onClick={onNext}
        disabled={!selected || saving || disabled}
        className="action-primary self-end"
      >
        {saving ? "Saving…" : "Next"}
      </button>
    </div>
  );
}
