export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-pink"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
