import { LoadingState } from '@/components/shared/LoadingState';
export const PURPOSE = "A few short checks help your tutor know where to start. It's okay to choose ‘I don't know.’";
export function PreparationPanel({ failed, working, onRetry }: { failed: boolean; working: boolean; onRetry: () => void }) {
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
    <h2 className="text-lg font-semibold text-slate-900">Getting your checks ready</h2>
    <p className="text-sm text-slate-700">{PURPOSE}</p>
    <p className="text-sm text-slate-700">We use your problem to choose relevant skills, then check the questions before showing them. You can work on the whiteboard while you wait.</p>
    {working && <LoadingState label="Preparing and checking your questions…" />}
    {failed && <p role="alert" className="text-sm text-red-700">Your problem is saved. Preparation did not finish.</p>}
    {!working && <button type="button" onClick={onRetry} className="rounded-full bg-blue-600 text-white px-4 py-2">{failed ? 'Retry preparation' : 'Prepare checks'}</button>}
  </section>;
}
