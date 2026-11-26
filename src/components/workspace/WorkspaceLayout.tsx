'use client';
import { useRef, type ReactNode } from 'react';
import { NotebookPen, X } from 'lucide-react';
import { SessionSteps } from '@/components/shared/SessionSteps';

export function WorkspaceLayout({ whiteboard, children, practicing }: {
  whiteboard: ReactNode; children: ReactNode; practicing: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  function close() {
    dialog.current?.close();
  }
  return <div className="page-shell">
    <div className="workspace-tools">
      <SessionSteps current={practicing ? 1 : 0} />
      <button type="button" className="action-secondary" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <NotebookPen size={16} aria-hidden />Open whiteboard
      </button>
    </div>
    {children}
    {/* Keep the editor mounted and sized so drafts, image imports and exports also work while closed. */}
    <dialog ref={dialog} aria-labelledby="board-heading" className="board-dialog"
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="flex h-full min-h-0 flex-col bg-card">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="section-title" id="board-heading">Whiteboard</h2>
          <button type="button" className="action-secondary" aria-label="Close whiteboard" onClick={close}>
            <X size={16} aria-hidden />Close
          </button>
        </header>
        <div className="min-h-0 flex-1 p-3">{whiteboard}</div>
      </div>
    </dialog>
  </div>;
}
