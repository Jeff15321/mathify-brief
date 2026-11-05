import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStores } from '@/server/storage';
import { startWorkspace, getPublicWorkspace } from '@/server/workspace-service';
import { analyzeCurrentWorkspace } from '@/server/analysis-service';
import { submitBrief } from '@/server/brief-service';
import { submitTutorFeedback } from '@/server/feedback-service';
import { GET, POST } from '@/app/api/feedback/route';

let stores: ReturnType<typeof createStores>;
vi.mock('@/server/storage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/server/storage')>(),
  getStores: () => stores,
}));

let dataDir: string;
let reportId: string;
const ratings = { accuracy: 4, clarity: 5, startingPointUsefulness: 3, comments: ' More context ' };
const post = (body: unknown) => POST(new Request('http://localhost/api/feedback', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

beforeEach(async () => {
  process.env.AI_MOCK_MODE = 'true';
  dataDir = await mkdtemp(path.join(tmpdir(), 'mathify-feedback-'));
  stores = createStores(dataDir);
  await startWorkspace({ questionText: 'Solve 2(x + 3) = 14.', files: [] }, stores);
  await analyzeCurrentWorkspace(stores);
  await submitBrief({ whiteboardPng: Buffer.from('test whiteboard bytes') }, stores);
  reportId = (await getPublicWorkspace(stores))!.feedbackReportId!;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dataDir, { recursive: true, force: true });
});

describe('feedback API and persistence', () => {
  it('saves exact report + assets, survives restart/new intake, and returns saved status', async () => {
    const workspace = await stores.workspaceStore.read();
    const response = await post({ reportId, ...ratings });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const record = await createStores(dataDir).feedbackStore.read(reportId);
    expect(record).toMatchObject({ reportId, accuracy: 4, clarity: 5, startingPointUsefulness: 3, comments: 'More context' });
    expect(record!.report.brief).toEqual(workspace!.brief);
    expect(Buffer.from(record!.assets[0].base64, 'base64').toString()).toBe('test whiteboard bytes');

    await startWorkspace({ questionText: 'A new question', files: [] }, stores);
    expect(await stores.assetStore.get(workspace!.whiteboardAsset!.id)).toBeNull();
    expect(await createStores(dataDir).feedbackStore.read(reportId)).toEqual(record);
    const status = await GET(new Request(`http://localhost/api/feedback?reportId=${reportId}`));
    expect(await status.json()).toEqual({ feedback: { reportId, submittedAt: record!.submittedAt } });
  });

  it('is idempotent for concurrent retries and does not overwrite a prior evaluation', async () => {
    const input = { reportId, ...ratings };
    const [first, second] = await Promise.all([submitTutorFeedback(input, stores), submitTutorFeedback(input, createStores(dataDir))]);
    expect(second).toEqual(first);
    expect((await post({ ...input, accuracy: 1 })).status).toBe(409);
    expect((await stores.feedbackStore.read(reportId))!.accuracy).toBe(4);
  });

  it('rejects an old tab after new intake, including queued submissions', async () => {
    const replace = startWorkspace({ questionText: 'Replacement', files: [] }, stores);
    await replace;
    expect((await post({ reportId, ...ratings })).status).toBe(409);
    expect(await stores.feedbackStore.read(reportId)).toBeNull();
  });

  it('holds the workspace lock through saving before a queued replacement', async () => {
    let release!: () => void;
    let entered!: () => void;
    const saving = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const write = stores.feedbackStore.write.bind(stores.feedbackStore);
    vi.spyOn(stores.feedbackStore, 'write').mockImplementation(async (record) => {
      entered(); await gate; await write(record);
    });
    const submit = submitTutorFeedback({ reportId, ...ratings }, stores);
    await saving;
    const replacement = startWorkspace({ questionText: 'Replacement', files: [] }, stores);
    release();
    await Promise.all([submit, replacement]);
    expect((await stores.feedbackStore.read(reportId))!.report.questionText).toBe('Solve 2(x + 3) = 14.');
    expect((await stores.workspaceStore.read())!.questionText).toBe('Replacement');
  });

  it('rejects changed report content and unfinished workspaces', async () => {
    await stores.workspaceStore.update((current) => ({ ...current!, brief: { ...current!.brief!, strengths: ['Changed'] } }));
    expect((await post({ reportId, ...ratings })).status).toBe(409);
    await stores.workspaceStore.update((current) => ({ ...current!, phase: 'ready' }));
    expect((await getPublicWorkspace(stores))!.feedbackReportId).toBeNull();
    expect((await post({ reportId, ...ratings })).status).toBe(409);
  });

  it('retains legacy reports and distinguishes new identical reports even with frozen timestamps', async () => {
    await stores.workspaceStore.update((current) => ({ ...current!, brief: { ...current!.brief!, reportId: undefined } }));
    const legacy = (await getPublicWorkspace(stores))!.feedbackReportId;
    expect(legacy).toMatch(/^[a-f0-9]{64}$/);
    expect((await post({ reportId: legacy, ...ratings })).status).toBe(200);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const ids = [];
      for (let i = 0; i < 2; i++) {
        await startWorkspace({ questionText: 'Same', files: [] }, stores);
        await analyzeCurrentWorkspace(stores);
        await submitBrief({ whiteboardPng: null }, stores);
        ids.push((await getPublicWorkspace(stores))!.feedbackReportId);
      }
      expect(ids[0]).not.toBe(ids[1]);
    } finally { vi.useRealTimers(); }
  });

  it.each([
    { accuracy: 0 }, { clarity: 6 }, { startingPointUsefulness: 2.5 },
    { accuracy: '4' }, { clarity: undefined }, { comments: 'x'.repeat(2001) },
    { reportId: '../../elsewhere' }, { unexpected: true },
  ])('rejects invalid input %j without saving', async (override) => {
    expect((await post({ reportId, ...ratings, ...override })).status).toBe(400);
    expect(await stores.feedbackStore.read(reportId)).toBeNull();
  });

  it('rejects malformed JSON and invalid lookup IDs', async () => {
    expect((await POST(new Request('http://localhost/api/feedback', { method: 'POST', body: '{' }))).status).toBe(400);
    expect((await GET(new Request('http://localhost/api/feedback?reportId=../../x'))).status).toBe(400);
  });

  it('returns a safe error on storage failure and permits a later retry', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(stores.feedbackStore, 'write').mockRejectedValueOnce(new Error('disk secret'));
    const response = await post({ reportId, ...ratings });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('disk secret');
    expect(log).toHaveBeenCalled();
    expect((await post({ reportId, ...ratings })).status).toBe(200);
  });
});
