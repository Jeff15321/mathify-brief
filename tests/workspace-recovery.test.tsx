import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PublicWorkspace } from '@/types/domain';
import type { SimpleWhiteboardHandle, WhiteboardProps } from '@/components/whiteboard/SimpleWhiteboard';
import WorkspacePage from '@/app/workspace/page';
import * as api from '@/lib/api-client';
import * as drafts from '@/lib/workspace-draft';
import { setupWorkspace, type Stores } from './helpers';
import { getPublicWorkspace } from '@/server/workspace-service';
import { generateNextProbePair, answerCurrentProbe } from '@/server/probe-service';
import { submitBrief } from '@/server/brief-service';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api-client', () => ({
  fetchWorkspace: vi.fn(), generateNextProbes: vi.fn(), answerProbe: vi.fn(),
  submitBrief: vi.fn(), startWorkspace: vi.fn(), analyzeQuestion: vi.fn(),
}));
// Canvas rendering needs a browser; keep draft storage, page state and server transitions real.
vi.mock('@/components/workspace/WhiteboardPanel', async () => {
  const React = await import('react');
  return { WhiteboardPanel: React.forwardRef<SimpleWhiteboardHandle, WhiteboardProps>(function Board(_props, ref) {
    React.useImperativeHandle(ref, () => ({ exportPng: async () => null }));
    return null;
  }) };
});

let stores: Stores;
let cleanStore: () => Promise<void>;
let draftId: string;
beforeEach(async () => {
  vi.resetAllMocks();
  history.replaceState(null, '', '/workspace');
  ({ stores, cleanup: cleanStore } = await setupWorkspace('workspace-recovery'));
  draftId = (await stores.workspaceStore.read())!.draftId;
  vi.mocked(api.fetchWorkspace).mockImplementation(() => getPublicWorkspace(stores));
  vi.mocked(api.generateNextProbes).mockImplementation(() => generateNextProbePair(stores));
  vi.mocked(api.answerProbe).mockImplementation((probeId, answer, workspaceId, hintOpened) =>
    answerCurrentProbe({ probeId, answer, workspaceId, hintOpened }, stores));
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await drafts.removeDraft(draftId);
  await cleanStore();
});

it('keeps the newest acknowledged answer when a recovery GET arrives late', async () => {
  const initial = (await getPublicWorkspace(stores))!;
  await generateNextProbePair(stores);
  const old = (await getPublicWorkspace(stores))!;
  let release!: (value: PublicWorkspace) => void;
  vi.mocked(api.fetchWorkspace).mockResolvedValueOnce(initial)
    .mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  vi.mocked(api.generateNextProbes).mockRejectedValueOnce(new Error('Response lost after prefetch'));
  render(<WorkspacePage />);
  await waitFor(() => expect(api.fetchWorkspace).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByDisplayValue('B'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Question 2 of 3');
  await act(async () => release(old));
  expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
  expect((await stores.workspaceStore.read())!.probeSteps[0].mainAnswer).toBe('B');
});

it('opens the saved report and removes its draft when Retry recovers a lost Finish response', async () => {
  await generateNextProbePair(stores);
  vi.mocked(api.submitBrief).mockImplementationOnce(async (_png, workspaceId, submissionId, pending) => {
    await submitBrief({ whiteboardPng: null, workspaceId, submissionId, pending }, stores);
    throw new Error('Response lost');
  });
  render(<WorkspacePage />);
  await screen.findByText('Question 1 of 3');
  fireEvent.click(screen.getByDisplayValue('B'));
  fireEvent.click(screen.getByRole('button', { name: 'Send to tutor' }));
  await screen.findByText('Response lost');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/brief'));
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  expect(await drafts.restoreDraft(null, draftId)).toBeNull();
  expect((await stores.workspaceStore.read())!.brief!.results[0].selectedOptionId).toBe('B');
});

it('leaves a saved draft untouched after a read failure and restores it on Retry', async () => {
  await generateNextProbePair(stores);
  const current = (await getPublicWorkspace(stores))!;
  const checkpoint: drafts.WorkspaceDraft = {
    id: draftId, workspaceId: current.workspaceId, expectedWorkspaceId: null,
    questionText: current.questionText, files: [], selection: 'IDK', selectedProbeId: 's1-main', hintOpened: true,
    board: { elements: [], files: {}, importedIds: ['saved-drawing'] }, updatedAt: Date.now(),
  };
  await drafts.saveDraft(checkpoint);
  vi.spyOn(drafts, 'restoreDraft').mockRejectedValueOnce(new Error('Temporary IndexedDB read failure'));
  render(<WorkspacePage />);
  await screen.findByText(/Saved drafts could not be read/);
  fireEvent(window, new Event('pagehide'));
  // No editor or answer controls may create a replacement before the checkpoint can be read.
  expect(screen.queryByRole('button', { name: 'Send to tutor' })).not.toBeInTheDocument();
  expect(await drafts.restoreDraft(current.workspaceId, draftId)).toEqual(checkpoint);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByDisplayValue('IDK')).toBeChecked());
  expect(screen.getByText('Hint:', { exact: true })).toBeInTheDocument();
  fireEvent.click(screen.getByDisplayValue('B'));
  await waitFor(async () => expect(await drafts.restoreDraft(current.workspaceId, draftId)).toMatchObject({
    selection: 'B', hintOpened: true, board: checkpoint.board,
  }));
});

it('opens a completed report even when local draft storage cannot be read', async () => {
  await submitBrief({ whiteboardPng: null }, stores);
  vi.spyOn(drafts, 'restoreDraft').mockRejectedValue(new Error('Storage unavailable'));
  render(<WorkspacePage />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/brief'));
  expect(screen.queryByText(/Saved drafts could not be read/)).not.toBeInTheDocument();
});
