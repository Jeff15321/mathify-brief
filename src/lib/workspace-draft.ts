import type { ProbeAnswer } from '@/types/domain';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

export interface BoardSnapshot { elements: readonly ExcalidrawElement[]; files: BinaryFiles; importedIds: string[] }
export interface WorkspaceDraft {
  id: string; workspaceId: string | null; expectedWorkspaceId: string | null;
  questionText: string; files: File[]; board?: BoardSnapshot;
  selectedProbeId?: string; selection?: ProbeAnswer; hintOpened?: boolean;
  submissionId?: string; updatedAt: number;
}
const DB = 'mathify-drafts-v1';
const STORE = 'drafts';
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Draft storage is blocked by another tab'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? new Error('Draft save was interrupted'));
    });
  } finally { db.close(); }
}
export async function saveDraft(draft: WorkspaceDraft): Promise<void> {
  await transaction('readwrite', store => store.put(draft));
}
export async function removeDraft(id: string): Promise<void> {
  await transaction('readwrite', store => store.delete(id));
}
export async function restoreDraft(workspaceId: string | null, id?: string): Promise<WorkspaceDraft | null> {
  const drafts = await transaction<WorkspaceDraft[]>('readonly', store => store.getAll());
  const now = Date.now();
  const expired = drafts.filter(d => now - d.updatedAt > DRAFT_TTL_MS);
  await Promise.all(expired.map(d => removeDraft(d.id)));
  return drafts.filter(d => now - d.updatedAt <= DRAFT_TTL_MS && (id ? d.id === id : d.workspaceId === workspaceId))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}
