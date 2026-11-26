import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { recordPilotEvent } from '@/client/measurement';
import { removeDraft, saveDraft, type BoardSnapshot, type WorkspaceDraft } from './draft';

export function useDraftAutosave(stopped: RefObject<boolean>) {
  const draftRef = useRef<WorkspaceDraft | null>(null);
  const [draft, setDraft] = useState<WorkspaceDraft | null>(null);
  const [initialBoard, setInitialBoard] = useState<BoardSnapshot>();
  const [storageError, setStorageError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());

  const initializeDraft = useCallback((value: WorkspaceDraft) => {
    draftRef.current = value;
    setInitialBoard(value.board);
    setDraft(value);
  }, []);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const source = draftRef.current;
    if (!source || stopped.current) return saving.current;

    const snapshot = structuredClone({ ...source, updatedAt: Date.now() });
    const context = { attemptId: source.id, workspaceId: source.workspaceId ?? undefined, mode: 'unknown' as const };
    const pending = saving.current.catch(() => {}).then(() => saveDraft(snapshot));
    saving.current = pending;
    void pending.then(() => {
      if (saving.current === pending && draftRef.current === source && !stopped.current) {
        setStorageError(null);
        recordPilotEvent('draft_saved', context);
      }
    }, () => {
      recordPilotEvent('draft_save_failed', context);
      setStorageError('This device could not save your draft. Keep this page open and retry saving before refreshing.');
    });
    return pending;
  }, [stopped]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush().catch(() => {}); }, 500);
  }, [flush]);

  function changeDraft(patch: Partial<WorkspaceDraft>, immediate = false) {
    if (!draftRef.current) return;
    draftRef.current = { ...draftRef.current, ...patch };
    setDraft(draftRef.current);
    if (immediate) void flush().catch(() => {});
    else scheduleSave();
  }

  // Drawing can change every frame. The editor owns its live scene until the next checkpoint.
  const boardChanged = useCallback((snapshot: BoardSnapshot) => {
    if (!draftRef.current || stopped.current) return;
    draftRef.current = { ...draftRef.current, board: snapshot };
    scheduleSave();
  }, [scheduleSave, stopped]);

  const discardDraft = useCallback(async (id: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saving.current.catch(() => {});
    await removeDraft(id).catch(() => {});
  }, []);

  useEffect(() => {
    const save = () => { void flush().catch(() => {}); };
    const hidden = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', hidden);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [flush]);

  return { draft, draftRef, initialBoard, storageError, initializeDraft, changeDraft, boardChanged, flush, discardDraft };
}
