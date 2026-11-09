import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setupWorkspace, type Stores } from './helpers';
import { submitBrief } from '@/server/brief-service';
import { answerCurrentProbe, generateNextProbePair } from '@/server/probe-service';
import { startWorkspace } from '@/server/workspace-service';
import { analyzeCurrentWorkspace } from '@/server/analysis-service';
import { MockAnalysisProvider } from '@/server/ai/mock-provider';
let stores: Stores;
let cleanup: () => Promise<void>;
beforeEach(async () => { ({ stores, cleanup } = await setupWorkspace('integrity')); });
afterEach(async () => { vi.restoreAllMocks(); await cleanup(); });
it('Finish saves a selected miss without inventing a shown follow-up', async () => {
  const workspaceId = (await stores.workspaceStore.read())!.workspaceId;
  const brief = await submitBrief({ workspaceId, submissionId: randomUUID(), whiteboardPng: null, pending: { probeId: 's1-main', answer: 'A' } }, stores);
  expect(brief.results).toHaveLength(1);
  expect(brief.results[0]).toMatchObject({ selectedOptionId: 'A', outcome: 'incorrect' });
  expect(brief.retries.total).toBe(0);
  expect(brief.notReachedConcepts).toHaveLength(2);
});
it('includes an acknowledged answer saved while the board uploads', async () => {
  const put = stores.assetStore.put.bind(stores.assetStore);
  let entered!: () => void; let release!: () => void;
  const uploading = new Promise<void>(r => { entered = r; });
  vi.spyOn(stores.assetStore, 'put').mockImplementationOnce(async input => {
    const asset = await put(input); entered(); await new Promise<void>(r => { release = r; }); return asset;
  });
  const sending = submitBrief({ whiteboardPng: Buffer.from('drawing') }, stores);
  await uploading;
  await answerCurrentProbe({ probeId: 's1-main', answer: 'B' }, stores);
  release();
  expect((await sending).results[0]).toMatchObject({ selectedOptionId: 'B', outcome: 'correct' });
});
it('same submission retries return the same report and conflicting submissions fail', async () => {
  const input = { submissionId: randomUUID(), whiteboardPng: null };
  const [first, second] = await Promise.all([submitBrief(input, stores), submitBrief(input, stores)]);
  expect(first).toEqual(second);
  expect(await submitBrief(input, stores)).toEqual(first);
  await expect(submitBrief({ ...input, submissionId: randomUUID() }, stores)).rejects.toMatchObject({ code: 'INVALID_STATE' });
});
it('stale tabs cannot answer or finalize a replacement workspace', async () => {
  const workspaceId = (await stores.workspaceStore.read())!.workspaceId;
  await startWorkspace({ questionText: 'replacement', files: [] }, stores);
  await analyzeCurrentWorkspace(stores);
  await expect(answerCurrentProbe({ workspaceId, probeId: 's1-main', answer: 'B' }, stores)).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await expect(submitBrief({ workspaceId, whiteboardPng: null }, stores)).rejects.toMatchObject({ code: 'INVALID_STATE' });
  expect((await stores.workspaceStore.read())!.probeSteps[0].mainAnswer).toBeNull();
});
it('a late export cannot attach its drawing to a replacement workspace', async () => {
  const put = stores.assetStore.put.bind(stores.assetStore);
  let entered!: () => void; let release!: () => void;
  const uploading = new Promise<void>(r => { entered = r; });
  const remove = vi.spyOn(stores.assetStore, 'remove');
  vi.spyOn(stores.assetStore, 'put').mockImplementationOnce(async input => {
    const asset = await put(input); entered(); await new Promise<void>(r => { release = r; }); return asset;
  });
  const sending = submitBrief({ whiteboardPng: Buffer.from('drawing') }, stores);
  const rejected = expect(sending).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await uploading;
  const replacement = await startWorkspace({ questionText: 'new', files: [] }, stores);
  release(); await rejected;
  expect((await stores.workspaceStore.read())!.workspaceId).toBe(replacement.workspaceId);
  expect((await stores.workspaceStore.read())!.whiteboardAsset).toBeNull();
  expect(remove).toHaveBeenCalledTimes(1);
});
it('retrying Begin is idempotent and changed input requires a new draft', async () => {
  const input = { questionText: 'new', files: [], draftId: randomUUID(), expectedWorkspaceId: (await stores.workspaceStore.read())!.workspaceId };
  const [a, b] = await Promise.all([startWorkspace(input, stores), startWorkspace(input, stores)]);
  expect(a.workspaceId).toBe(b.workspaceId);
  expect((await startWorkspace(input, stores)).workspaceId).toBe(a.workspaceId);
  await expect(startWorkspace({ ...input, questionText: 'changed' }, stores)).rejects.toMatchObject({ code: 'INVALID_STATE' });
});
it('duplicate analysis observes the existing operation without a second provider call', async () => {
  await startWorkspace({ questionText: 'new', files: [] }, stores);
  const original = MockAnalysisProvider.prototype.analyzeQuestion;
  let entered!: () => void; let release!: () => void;
  const analyzing = new Promise<void>(r => { entered = r; });
  const spy = vi.spyOn(MockAnalysisProvider.prototype, 'analyzeQuestion').mockImplementationOnce(async function(this: MockAnalysisProvider, input) {
    entered(); await new Promise<void>(r => { release = r; }); return original.call(this, input);
  });
  const first = analyzeCurrentWorkspace(stores);
  await analyzing;
  expect(await analyzeCurrentWorkspace(stores)).toBeNull();
  release(); await first;
  expect(spy).toHaveBeenCalledTimes(1);
});

it('late analysis cannot replace a newer draft or mark its operation failed', async () => {
  await startWorkspace({ questionText: 'old', files: [] }, stores);
  const original = MockAnalysisProvider.prototype.analyzeQuestion;
  let entered!: () => void; let release!: () => void;
  const analyzing = new Promise<void>(r => { entered = r; });
  vi.spyOn(MockAnalysisProvider.prototype, 'analyzeQuestion').mockImplementationOnce(async function(this: MockAnalysisProvider, input) {
    entered(); await new Promise<void>(r => { release = r; }); return original.call(this, input);
  });
  const pending = analyzeCurrentWorkspace(stores);
  const rejected = expect(pending).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await analyzing;
  const replacement = await startWorkspace({ questionText: 'new', files: [] }, stores);
  const before = await stores.workspaceStore.read();
  release(); await rejected;
  expect((await stores.workspaceStore.read())!.workspaceId).toBe(replacement.workspaceId);
  expect(await stores.workspaceStore.read()).toEqual(before);
});

it.each(['replacement', 'completion'] as const)('late probe generation leaves %s intact', async action => {
  const original = MockAnalysisProvider.prototype.generateProbePair;
  let entered!: () => void; let release!: () => void;
  const generating = new Promise<void>(r => { entered = r; });
  vi.spyOn(MockAnalysisProvider.prototype, 'generateProbePair').mockImplementationOnce(async function(this: MockAnalysisProvider, input) {
    entered(); await new Promise<void>(r => { release = r; }); return original.call(this, input);
  });
  const pending = generateNextProbePair(stores);
  const rejected = expect(pending).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await generating;
  if (action === 'replacement') await startWorkspace({ questionText: 'new', files: [] }, stores);
  else await submitBrief({ whiteboardPng: null, pending: { probeId: 's1-main', answer: 'B' } }, stores);
  const before = await stores.workspaceStore.read();
  release(); await rejected;
  expect(await stores.workspaceStore.read()).toEqual(before);
});
