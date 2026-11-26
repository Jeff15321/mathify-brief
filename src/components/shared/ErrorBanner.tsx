export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-panel border border-alert/30 bg-alert-wash px-4 py-3 text-sm text-alert"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-panel border border-alert/40 bg-card px-3 py-1 font-semibold hover:bg-alert-wash"
        >
          Retry
        </button>
      )}
    </div>
  );
}
