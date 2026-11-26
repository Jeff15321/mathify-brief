export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-panel border border-pink bg-wash px-4 py-3 text-sm text-ink"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-panel border border-pink px-3 py-1 font-bold hover:bg-wash"
        >
          Retry
        </button>
      )}
    </div>
  );
}
