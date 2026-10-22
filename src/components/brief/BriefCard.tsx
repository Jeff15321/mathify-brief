import type { ReactNode } from "react";

export type BriefCardTone = "neutral" | "strength" | "gap";

const TONE_CLASSES: Record<BriefCardTone, string> = {
  neutral: "border-slate-200 bg-white",
  strength: "border-emerald-200 bg-emerald-50",
  gap: "border-amber-200 bg-amber-50",
};

/**
 * Shared card shell for the Tutor Brief dashboard, so every card has the same border, radius and
 * padding.
 * @param title - Optional heading; `icon` sits before it and `badge` is pushed to the right.
 */
export function BriefCard({
  title,
  icon,
  badge,
  tone = "neutral",
  className = "",
  children,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  tone?: BriefCardTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2 rounded-xl border p-4 shadow-sm ${TONE_CLASSES[tone]} ${className}`}>
      {(title || badge) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {icon}
              {title}
            </h2>
          )}
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small rounded status label used in card headers. */
export function BriefBadge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
