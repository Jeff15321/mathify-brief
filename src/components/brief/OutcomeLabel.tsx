import type { ProbeOutcome } from "@/types/domain";

const OUTCOMES: Record<ProbeOutcome, { symbol: string; label: string; color: string }> = {
  correct: { symbol: "✓", label: "Correct", color: "text-emerald-800" },
  incorrect: { symbol: "×", label: "Incorrect", color: "text-amber-800" },
  dont_know: { symbol: "?", label: "Unsure", color: "text-amber-800" },
  unanswered: { symbol: "—", label: "Not answered", color: "text-slate-500" },
};

const BADGE_COLORS: Record<ProbeOutcome, string> = {
  correct: "border-emerald-600 bg-emerald-100 text-emerald-800",
  incorrect: "border-rose-600 bg-rose-100 text-rose-800",
  dont_know: "border-amber-600 bg-amber-100 text-amber-800",
  unanswered: "border-slate-500 bg-slate-200 text-slate-700",
};

export function OutcomeLabel({ outcome, appearance = "text" }: { outcome: ProbeOutcome; appearance?: "text" | "badge" }) {
  const { symbol, label, color } = OUTCOMES[outcome];
  const badge = appearance === "badge";
  const style = badge ? `h-8 w-[100px] shrink-0 gap-0.5 items-center justify-center whitespace-nowrap rounded-full border ${BADGE_COLORS[outcome]}` : `items-baseline gap-1 ${color}`;
  return <span className={`inline-flex text-sm font-semibold ${style}`}><span aria-hidden="true">{badge && outcome === "unanswered" ? "–" : symbol}</span>{badge && outcome === "unanswered" ? "Unanswered" : label}</span>;
}
