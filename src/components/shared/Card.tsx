import type { ReactNode } from "react";

export type CardTone = "neutral" | "strength" | "gap";

const TONE_CLASSES: Record<CardTone, string> = {
  neutral: "border-line bg-card",
  strength: "border-line bg-sage-wash",
  gap: "border-line bg-wash",
};

/**
 * Shared card shell for the tutor brief, session details, and learner profile.
 * @param title - Optional heading; `icon` sits before it and `badge` is pushed to the right.
 */
export function Card({
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
  tone?: CardTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2 rounded-card border p-4 sm:p-6 ${TONE_CLASSES[tone]} ${className}`}>
      {(title || badge) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-lg leading-tight font-semibold text-ink">
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
export function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-bold ${className}`}>{children}</span>;
}
