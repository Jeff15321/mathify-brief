import type { Page } from '@playwright/test';
import type { WorkspaceDraft } from '@/components/workspace/draft';

/** Read the current draft so refresh tests wait for the edit they intend to recover. */
export function readDraftCheckpoint(page: Page) {
  return page.evaluate(async () => {
    const id = new URLSearchParams(location.search).get('draft');
    if (!id) return null;

    return new Promise<{ drawingCount: number; hintOpened: boolean } | null>((resolve, reject) => {
      const open = indexedDB.open('mathify-drafts-v1');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('drafts');
        const read = tx.objectStore('drafts').get(id);
        tx.oncomplete = () => {
          db.close();
          const draft: WorkspaceDraft | undefined = read.result;
          resolve(draft ? {
            drawingCount: draft.board?.elements.filter(element => !element.isDeleted && element.type === "freedraw").length ?? 0,
            hintOpened: draft.hintOpened === true,
          } : null);
        };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  });
}
