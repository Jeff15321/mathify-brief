import { LoadingState } from '@/components/shared/LoadingState';
export const PURPOSE = "Practice questions help your tutor know where to start. It's okay to choose ‘I don't know.’";
export function PreparationPanel({ failed, working, onRetry }: { failed: boolean; working: boolean; onRetry: () => void }) {
  return <section className="rounded-card border border-pale bg-wash p-5 space-y-3">
    <h2 className="text-lg font-bold text-ink">Getting your practice questions ready</h2>
    <p className="text-sm text-ink">{PURPOSE}</p>
    <p className="text-sm text-ink">We use your problem to choose relevant skills, then check the questions before showing them. You can work on the whiteboard while you wait.</p>
    {working && <LoadingState label="Preparing and checking your questions…" />}
    {failed && <p role="alert" className="text-sm text-alert">Your problem is saved. Preparation did not finish.</p>}
    {!working && <button type="button" onClick={onRetry} className="rounded-full bg-brand text-card px-4 py-2">{failed ? 'Retry preparation' : 'Prepare practice questions'}</button>}
  </section>;
}
