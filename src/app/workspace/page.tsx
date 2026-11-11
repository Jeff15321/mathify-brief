'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeQuestion, answerProbe, fetchWorkspace, generateNextProbes, startWorkspace, submitBrief } from '@/lib/api-client';
import { viewFor } from '@/lib/workspace-flow';
import type { ProbeAnswer, PublicProbing, PublicWorkspace } from '@/types/domain';
import { restoreDraft, saveDraft, removeDraft, type BoardSnapshot, type WorkspaceDraft } from '@/lib/workspace-draft';
import { ThreePanelLayout } from '@/components/workspace/ThreePanelLayout';
import { WhiteboardPanel } from '@/components/workspace/WhiteboardPanel';
import { ProbingPanel } from '@/components/workspace/ProbingPanel';
import { BreakdownPanel } from '@/components/workspace/BreakdownPanel';
import { PreparationPanel, PURPOSE } from '@/components/workspace/PreparationPanel';
import { QuestionIntakeForm } from '@/components/intake/QuestionIntakeForm';
import { QuestionDisplay } from '@/components/workspace/QuestionDisplay';
import type { SimpleWhiteboardHandle } from '@/components/whiteboard/SimpleWhiteboard';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export default function WorkspacePage() {
  const router = useRouter();
  const board = useRef<SimpleWhiteboardHandle>(null);
  const [initialBoard, setInitialBoard] = useState<BoardSnapshot>();
  const draftRef = useRef<WorkspaceDraft | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const stopped = useRef(false);
  const prefetchRef = useRef<Promise<void> | null>(null);
  const [draft, setDraft] = useState<WorkspaceDraft | null>(null);
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [storageError, setStorageError] = useState<string | null>(null);
  const probing = workspace?.probing;
  const workspaceId = workspace?.workspaceId;
  const selection = draft?.selectedProbeId === probing?.current?.id ? draft?.selection : undefined;

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!draftRef.current || stopped.current) return saving.current;
    const source = draftRef.current;
    const snapshot = structuredClone({ ...source, updatedAt: Date.now() });
    setSaveStatus('Saving…');
    const pending = saving.current.catch(() => {}).then(() => saveDraft(snapshot));
    saving.current = pending;
    void pending.then(() => { if (saving.current === pending && draftRef.current === source && !stopped.current) { setSaveStatus('Saved on this device'); setStorageError(null); } }, () => {
      setSaveStatus('Not saved'); setStorageError('This device could not save your draft. Keep this page open and retry saving before refreshing.');
    });
    return pending;
  }, []);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('Unsaved changes');
    saveTimer.current = setTimeout(() => { void flush().catch(() => {}); }, 500);
  }, [flush]);
  function changeDraft(patch: Partial<WorkspaceDraft>, immediate = false) {
    if (!draftRef.current) return;
    draftRef.current = { ...draftRef.current, ...patch };
    setDraft(draftRef.current);
    if (immediate) void flush().catch(() => {}); else scheduleSave();
  }
  const boardChanged = useCallback((snapshot: BoardSnapshot) => {
    if (!draftRef.current || stopped.current) return;
    draftRef.current = { ...draftRef.current, board: snapshot };
    scheduleSave();
  }, [scheduleSave]);

  useEffect(() => {
    let cancelled = false;
    stopped.current = false;
    async function load() {
      try {
        const current = await fetchWorkspace();
        const params = new URLSearchParams(location.search);
        const fresh = params.has('new');
        const requestedDraft = params.get('draft') ?? undefined;
        let recovered: WorkspaceDraft | null = null;
        try {
          if (!fresh) recovered = await restoreDraft(current?.workspaceId ?? null, requestedDraft);
          // Recover a drawing saved before Begin's response reached the browser.
          if (!fresh && !recovered && current) {
            const pending = await restoreDraft(null, current.draftId);
            if (pending) recovered = { ...pending, workspaceId: current.workspaceId };
          }
        } catch { if (!cancelled) setStorageError('Saved drafts could not be read. Keep this page open while working.'); }
        if (cancelled) return;
        const belongs = !fresh && (!requestedDraft || current?.draftId === requestedDraft);
        if (recovered?.workspaceId && recovered.workspaceId !== current?.workspaceId) throw new Error('This draft belongs to a replaced workspace. Open a new question to continue.');
        if (belongs && current?.brief) { router.replace('/brief'); return; }
        const active = belongs ? current : null;
        const next: WorkspaceDraft = recovered ?? {
          id: active?.draftId ?? crypto.randomUUID(), workspaceId: active?.workspaceId ?? null,
          expectedWorkspaceId: current?.workspaceId ?? null, questionText: active?.questionText ?? '', files: [], updatedAt: Date.now(),
        };
        if (active) next.workspaceId = active.workspaceId;
        draftRef.current = next; setInitialBoard(next.board);
        setDraft(next); setWorkspace(active); setLoaded(true); setError(null);
        history.replaceState(null, '', `/workspace?draft=${next.id}`);
      } catch (err) { if (!cancelled) setError(message(err)); }
    }
    void load();
    return () => { cancelled = true; };
  }, [router, loadAttempt]);
  useEffect(() => {
    const save = () => { void flush().catch(() => {}); };
    const hidden = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [flush]);

  const refresh = useCallback(async () => {
    const next = await fetchWorkspace();
    if (!next || (workspaceId && next.workspaceId !== workspaceId)) throw new Error('The workspace changed in another tab. Reload to continue.');
    setWorkspace(next);
    return next;
  }, [workspaceId]);
  const applyProbing = useCallback((next: PublicProbing) => {
    setWorkspace(previous => previous && (!previous.probing || next.revision >= previous.probing.revision) ? { ...previous, probing: next } : previous);
  }, []);
  const prefetch = useCallback(() => {
    if (!workspaceId || prefetchRef.current) return;
    const run = (async () => {
      try { applyProbing(await generateNextProbes(workspaceId)); }
      catch { await refresh().catch(err => setError(message(err))); }
      finally { prefetchRef.current = null; }
    })();
    prefetchRef.current = run;
  }, [workspaceId, applyProbing, refresh]);
  useEffect(() => { if (probing?.needsPrefetch) prefetch(); }, [probing, prefetch]);
  useEffect(() => {
    const waiting = workspace?.analysisStatus === 'generating' || probing?.waitingStatus === 'generating';
    if (!waiting) return;
    const timer = setTimeout(() => { void refresh().catch(err => setError(message(err))); }, 1500);
    return () => clearTimeout(timer);
  }, [workspace, probing, refresh]);

  async function prepare(id: string) {
    setPreparing(true); setError(null);
    try { await analyzeQuestion(id); await refresh(); }
    catch (err) { setError(message(err)); await refresh().catch(() => {}); }
    finally { setPreparing(false); }
  }
  async function begin() {
    if (!draftRef.current || uploading) return;
    setUploading(true); setError(null);
    try {
      await flush().catch(() => {});
      const value = draftRef.current;
      const id = await startWorkspace(value.questionText, value.files, value.id, value.expectedWorkspaceId);
      changeDraft({ workspaceId: id }, true);
      const next = await fetchWorkspace();
      if (!next || next.workspaceId !== id) throw new Error('The workspace changed. Reload to continue.');
      setWorkspace(next);
      setUploading(false);
      if (!next.analysis) await prepare(id);
    } catch (err) { setError(message(err)); }
    finally { setUploading(false); }
  }
  async function next() {
    if (!workspaceId || !probing?.current || !selection || answering) return;
    setAnswering(true); setError(null);
    try {
      const result = await answerProbe(probing.current.id, selection, workspaceId);
      changeDraft({ selectedProbeId: undefined, selection: undefined, hintOpened: false }, true);
      applyProbing(result);
    } catch (err) { setError(message(err)); await refresh().catch(() => {}); }
    finally { setAnswering(false); }
  }
  async function finish(omit = false) {
    if (!workspaceId || !draftRef.current || submitting || answering) return;
    setSubmitting(true); setError(null);
    changeDraft({ submissionId: draftRef.current.submissionId ?? crypto.randomUUID() }, true);
    let png: Blob | null = null;
    try {
      if (!omit) {
        try { if (!board.current) throw new Error('The drawing board is still loading.'); png = await board.current.exportPng(); }
        catch (err) { setExportFailed(true); throw err; }
      }
      await submitBrief(png, workspaceId, draftRef.current.submissionId!, probing?.current && selection ? { probeId: probing.current.id, answer: selection } : undefined, omit);
      stopped.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await saving.current.catch(() => {});
      await removeDraft(draftRef.current.id).catch(() => {});
      router.push('/brief');
    } catch (err) { setError(message(err)); setSubmitting(false); }
  }
  if (!loaded || !draft) return <main className="max-w-xl mx-auto p-8">{error ? <ErrorBanner message={error} onRetry={() => setLoadAttempt(n => n + 1)} /> : <LoadingState label="Loading your workspace…" />}<a href="/workspace?new=1" className="text-blue-700 underline">New question</a></main>;
  return <main data-phase={submitting ? 'submitting' : uploading ? 'uploading' : viewFor(workspace)} className="flex h-dvh flex-col bg-slate-50">
    <header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3 text-sm">
      <span className="font-semibold">Mathify · Get ready for your tutor</span>
      <span role="status" className="text-xs text-slate-600">{saveStatus}</span>
      <a href="/workspace?new=1" className="text-blue-700 underline">New question</a>
    </header>
    {storageError && <div className="px-3 pt-2"><ErrorBanner message={storageError} onRetry={() => void flush().catch(() => {})} /></div>}
    {error && <div className="px-3 pt-2"><ErrorBanner message={error} onRetry={() => void refresh().then(() => setError(null)).catch(err => setError(message(err)))} /></div>}
    {exportFailed && <div className="flex gap-3 px-3 py-2 text-sm"><span>Your drawing could not be attached.</span><button disabled={submitting} onClick={() => void finish()} className="text-blue-700 underline">Retry drawing export</button><button disabled={submitting} onClick={() => void finish(true)} className="text-blue-700 underline">Send without drawing</button></div>}
    <span role="status" className="sr-only">{probing?.current ? 'Your checks are ready in Relevant Concepts.' : ''}</span>
    <div className="min-h-0 flex-1"><ThreePanelLayout
      whiteboard={<WhiteboardPanel ref={board} disabled={submitting} attachments={workspace?.attachments} initialBoard={initialBoard} onBoardChange={boardChanged} onFlush={() => void flush().catch(() => {})} />}
      probing={<div className="flex h-full min-h-0 flex-col gap-3">
        {!workspace && <div className="overflow-y-auto"><QuestionIntakeForm questionText={draft.questionText} files={draft.files} busy={uploading} onChange={(text, files) => changeDraft({ questionText: text, files })} onBegin={() => void begin()} /></div>}
        {workspace && !workspace.analysis && <div className="overflow-y-auto space-y-3"><PreparationPanel failed={workspace.analysisStatus === 'failed'} working={preparing || workspace.analysisStatus === 'generating'} onRetry={() => void prepare(workspace.workspaceId)} /><QuestionDisplay questionText={workspace.questionText} parsedQuestionMarkdown={workspace.questionText || 'Your uploaded problem'} attachments={workspace.attachments} /></div>}
        {workspace?.analysis && probing && <>
          <div className="space-y-2 text-sm"><p className="text-slate-700">{PURPOSE}</p><BreakdownPanel analysis={workspace.analysis} />
            <details><summary className="cursor-pointer text-blue-700">Your original problem</summary><div className="max-h-48 overflow-y-auto"><QuestionDisplay questionText={workspace.questionText} parsedQuestionMarkdown={workspace.analysis.parsedQuestionMarkdown} attachments={workspace.attachments} /></div></details>
          </div>
          <div className="min-h-0 flex-1"><ProbingPanel probing={probing} selection={selection} onSelect={(answer: ProbeAnswer) => changeDraft({ selectedProbeId: probing.current?.id, selection: answer }, true)} onNext={() => void next()} onRetry={prefetch} answering={answering} onSubmit={() => void finish()} submitting={submitting} /></div>
        </>}
      </div>} />
    </div>
  </main>;
}
