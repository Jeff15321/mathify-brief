import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { BriefCard } from "./BriefCard";

const TONES = {
  strength: {
    title: "Observed strengths",
    icon: <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />,
    text: "text-emerald-900",
  },
  gap: {
    title: "Possible gaps",
    icon: <AlertTriangle size={16} className="text-amber-600" aria-hidden="true" />,
    text: "text-amber-900",
  },
} as const;

/** A short list of concept names: what the student showed, or where they may need help. */
export function ConceptListCard({ tone, concepts }: { tone: keyof typeof TONES; concepts: string[] }) {
  const { title, icon, text } = TONES[tone];
  return (
    <BriefCard tone={tone} title={title} icon={icon}>
      {concepts.length === 0 ? (
        <p className="text-sm text-slate-500">None observed.</p>
      ) : (
        <ul className={`flex flex-col gap-1 text-sm ${text}`}>
          {concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>
      )}
    </BriefCard>
  );
}
