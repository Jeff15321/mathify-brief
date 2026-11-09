import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { restoreDraft, saveDraft, removeDraft, DRAFT_TTL_MS, type WorkspaceDraft } from '@/lib/workspace-draft';
function draft(): WorkspaceDraft { return { id: randomUUID(), workspaceId: randomUUID(), expectedWorkspaceId: null, questionText: 'a draft', files: [], selectedProbeId: 's1-main', selection: 'IDK', hintOpened: true, board: { elements: [], files: {}, importedIds: ['source'] }, updatedAt: Date.now() }; }
it('commits selection, source import identity and board together, then deletes them', async () => {
  const value = draft(); await saveDraft(value);
  expect(await restoreDraft(value.workspaceId)).toEqual(value);
  expect(await restoreDraft(null, value.id)).toEqual(value);
  expect(await restoreDraft(randomUUID())).toBeNull();
  await removeDraft(value.id); expect(await restoreDraft(value.workspaceId)).toBeNull();
});
it('expires abandoned drafts without restoring another workspace', async () => {
  const value = { ...draft(), updatedAt: Date.now() - DRAFT_TTL_MS - 1 }; await saveDraft(value);
  expect(await restoreDraft(value.workspaceId)).toBeNull();
});
