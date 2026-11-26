export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-panel border border-alert/30 bg-alert-wash px-4 py-3 text-sm text-ink"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="action-secondary shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
