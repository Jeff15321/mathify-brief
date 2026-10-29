import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { BriefCard } from "./BriefCard";

const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; badge: string; label: string; description: string }> = {
  high: {
    icon: <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" />,
    badge: "bg-emerald-100 text-emerald-700",
    label: "High confidence",
    description: "The report is based on solid evidence.",
  },
  medium: {
    icon: <Shield size={16} className="text-amber-600" aria-hidden="true" />,
    badge: "bg-amber-100 text-amber-700",
    label: "Medium confidence",
    description: "Some factors reduce confidence in the report.",
  },
  low: {
    icon: <ShieldAlert size={16} className="text-red-600" aria-hidden="true" />,
    badge: "bg-red-100 text-red-700",
    label: "Low confidence",
    description: "Several factors make this report less reliable.",
  },
};

/**
 * Displays the confidence level of the Tutor Brief, with contributing factors.
 */
export function ConfidenceCard({
  confidence,
  factors,
  earlyExit,
}: {
  confidence: "high" | "medium" | "low";
  factors: Array<{ factor: string; detail: string }>;
  earlyExit: boolean;
}) {
  const config = LEVEL_CONFIG[confidence];

  return (
    <BriefCard title="Report confidence" icon={config.icon}>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
          {config.label}
        </span>
        {earlyExit && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Early exit
          </span>
        )}
      </div>
      {factors.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-slate-600">
          {factors.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              <span>
                <span className="font-medium text-slate-700">{f.factor}:</span> {f.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BriefCard>
  );
}
