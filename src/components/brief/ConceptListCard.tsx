import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/shared/Card";

const TONES = {
  strength: {
    title: "Observed strengths",
    icon: <CheckCircle2 size={16} className="text-ink" aria-hidden="true" />,
    text: "text-ink",
  },
  gap: {
    title: "Possible gaps",
    icon: <AlertTriangle size={16} className="text-ink" aria-hidden="true" />,
    text: "text-ink",
  },
} as const;

/** A short list of concept names: what the student showed, or where they may need help. */
export function ConceptListCard({ tone, concepts }: { tone: keyof typeof TONES; concepts: string[] }) {
  const { title, icon, text } = TONES[tone];
  return (
    <Card tone={tone} title={title} icon={icon}>
      {concepts.length === 0 ? (
        <p className="text-sm text-muted">None observed.</p>
      ) : (
        <ul className={`flex flex-col gap-1 text-sm ${text}`}>
          {concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
