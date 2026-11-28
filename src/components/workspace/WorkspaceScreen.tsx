'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeQuestion, answerProbe, fetchWorkspace, generateNextProbes, startWorkspace, submitBrief } from '@/client/workspace';
import { recordPilotEvent, type PilotCounts, type PilotEventName } from '@/client/measurement';
import { useDraftAutosave } from './useDraftAutosave';
import { viewFor } from './flow';
import type { PublicWorkspace } from '@/contracts/workspace';
import type { ProbeAnswer, PublicProbing } from '@/contracts/probes';
import { restoreDraft, type WorkspaceDraft } from './draft';
import { WorkspaceLayout } from './WorkspaceLayout';
import { WhiteboardPanel } from './WhiteboardPanel';
import { ProbingPanel } from './ProbingPanel';
import { PreparationPanel } from './PreparationPanel';
import { QuestionIntakeForm } from '@/components/intake/QuestionIntakeForm';
import { TutorBriefView } from '@/components/brief/TutorBriefView';
import { QuestionDisplay } from './QuestionDisplay';
import type { SimpleWhiteboardHandle } from '@/components/whiteboard/SimpleWhiteboard';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export default function WorkspaceScreen() {
  const board = useRef<SimpleWhiteboardHandle>(null);
  const stopped = useRef(false);
  const prefetchRef = useRef<Promise<void> | null>(null);
  const { draft, draftRef, initialBoard, storageError, initializeDraft, changeDraft, boardChanged, flush, discardDraft } = useDraftAutosave(stopped);
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const probing = workspace?.probing;
  const workspaceId = workspace?.workspaceId;
  const generationMode = workspace?.generationMode ?? 'unknown';
  const promptVersion = workspace?.promptVersion;
  const track = useCallback((event: PilotEventName, counts: PilotCounts = {}, observed?: PublicWorkspace) => {
    if (!draftRef.current) return;
    recordPilotEvent(event, { attemptId: draftRef.current.id, workspaceId: observed?.workspaceId ?? draftRef.current.workspaceId ?? undefined,
      mode: observed?.generationMode ?? generationMode, promptVersion: observed?.promptVersion ?? promptVersion }, counts);
  }, [draftRef, generationMode, promptVersion]);
  const currentProbeId = probing?.current?.id;
  const probeShownAtRef = useRef<{ probeId: string; at: number } | null>(null);
  const probeVisible = useCallback(() => {
    if (!currentProbeId) return;
    if (probeShownAtRef.current?.probeId !== currentProbeId) {
      probeShownAtRef.current = { probeId: currentProbeId, at: performance.now() };
    }
    track('probe_visible', { probeId: currentProbeId });
  }, [track, currentProbeId]);
  const readProbeDurationMs = useCallback((probeId: string) => {
    const started = probeShownAtRef.current;
    if (!started || started.probeId !== probeId) return undefined;
    return Math.min(3_600_000, Math.max(0, Math.round(performance.now() - started.at)));
  }, []);
  const analysisReady = Boolean(workspace?.analysis);
  const serverDurationMs = workspace?.analysis?.preparationDurationMs;
  useEffect(() => {
    if (!currentProbeId) return;
    if (probeShownAtRef.current?.probeId !== currentProbeId) {
      probeShownAtRef.current = { probeId: currentProbeId, at: performance.now() };
    }
    track('probe_ready', { probeId: currentProbeId });
  }, [currentProbeId, track]);
  useEffect(() => { if (analysisReady) track('analysis_ready', { serverDurationMs }); }, [analysisReady, workspaceId, track, serverDurationMs]);
  const hintOpened = draft?.selectedProbeId === probing?.current?.id && draft?.hintOpened === true;
  const selection = draft?.selectedProbeId === probing?.current?.id ? draft?.selection : undefined;
  const probingPhase = analysisReady && Boolean(probing);
  // Auto-submit once the last planned question is answered (and on a draft-restored finished
  // flow). Runs as an effect so it reads fresh state — by then `answering` is false and the
  // selection is cleared, so finish() sends no stale pending answer.
  const probingFinished = probingPhase && probing?.finished === true;
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!probingFinished || autoSubmittedRef.current || submitting || answering || stopped.current) return;
    autoSubmittedRef.current = true;
    void finish();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- finish reads the latest selection/probing state
  }, [probingFinished, submitting, answering]);

  const openReport = useCallback(async (completedDraftId: string) => {
    if (stopped.current) return;
    stopped.current = true;
    setSubmitting(true);
    await discardDraft(completedDraftId);
    try {
      const current = await fetchWorkspace();
      if (!current?.brief) throw new Error('Your report could not be opened. Please retry.');
      setWorkspace(current);
      setLoaded(true);
      setError(null);
    } catch (err) {
      stopped.current = false;
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [discardDraft]);

  useEffect(() => {
    let cancelled = false;
    stopped.current = false;
    async function load() {
      try {
        const current = await fetchWorkspace();
        if (cancelled) return;
        const params = new URLSearchParams(location.search);
        const fresh = params.has('new');
        const requestedDraft = params.get('draft') ?? undefined;
        const belongs = !fresh && (!requestedDraft || current?.draftId === requestedDraft);
        if (belongs && current?.brief) { await openReport(current.draftId); return; }
        let recovered: WorkspaceDraft | null = null;
        try {
          if (!fresh) recovered = await restoreDraft(current?.workspaceId ?? null, requestedDraft);
          // Recover a drawing saved before Begin's response reached the browser.
          if (!fresh && !recovered && current) {
            const pending = await restoreDraft(null, current.draftId);
            if (pending) recovered = { ...pending, workspaceId: current.workspaceId };
          }
        } catch {
          // Leave the editor unmounted and draftRef empty: even autosaving a blank board
          // would overwrite the last checkpoint under the existing draft ID.
          throw new Error('Saved drafts could not be read. Retry loading before continuing, or open a new question.');
        }
        if (cancelled) return;
        if (recovered?.workspaceId && recovered.workspaceId !== current?.workspaceId) throw new Error('This draft belongs to a replaced workspace. Open a new question to continue.');
        const active = belongs ? current : null;
        const next: WorkspaceDraft = recovered ?? {
          id: active?.draftId ?? crypto.randomUUID(), workspaceId: active?.workspaceId ?? null,
          expectedWorkspaceId: current?.workspaceId ?? null, questionText: active?.questionText ?? '', files: [], updatedAt: Date.now(),
        };
        if (active) next.workspaceId = active.workspaceId;
        initializeDraft(next);
        setWorkspace(active);
        setLoaded(true);
        setError(null);
        recordPilotEvent(recovered ? 'draft_restored' : 'draft_opened', { attemptId: next.id, workspaceId: next.workspaceId ?? undefined, mode: active?.generationMode ?? 'unknown', promptVersion: active?.promptVersion });
        history.replaceState(null, '', `/workspace?draft=${next.id}`);
      } catch (err) { if (!cancelled) setError(message(err)); }
    }
    void load();
    return () => { cancelled = true; };
  }, [openReport, loadAttempt, initializeDraft]);
  const refresh = useCallback(async () => {
    const next = await fetchWorkspace();
    if (!next || (workspaceId && next.workspaceId !== workspaceId)) throw new Error('The workspace changed in another tab. Reload to continue.');
    if (stopped.current) return next;
    setWorkspace(previous => {
      if (previous?.brief || stopped.current) return previous ?? next;
      if (previous?.phase === 'complete') return previous;
      if (next.phase === 'complete') return next;
      // Recovery GETs and polls can finish after a newer answer/prefetch response.
      if (previous?.probing && (!next.probing || next.probing.revision < previous.probing.revision)) return previous;
      return next;
    });
    if (next.brief) await openReport(next.draftId);
    return next;
  }, [workspaceId, openReport]);
  const applyProbing = useCallback((next: PublicProbing) => {
    setWorkspace(previous => previous?.phase === 'ready' && (!previous.probing || next.revision >= previous.probing.revision) ? { ...previous, probing: next } : previous);
  }, []);
  const prefetch = useCallback(() => {
    if (!workspaceId || stopped.current || prefetchRef.current) return;
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

  async function prepare(id: string, observed?: PublicWorkspace) {
    track('analysis_started', {}, observed);
    setPreparing(true); setError(null);
    try { await analyzeQuestion(id); await refresh(); }
    catch (err) { track('analysis_failed', {}, observed); setError(message(err)); await refresh().catch(() => {}); }
    finally { setPreparing(false); }
  }
  async function begin() {
    if (!draftRef.current || uploading) return;
    setUploading(true); setError(null);
    track('begin_clicked', { fileCount: draftRef.current.files.length });
    const uploadStarted = performance.now();
    try {
      await flush().catch(() => {});
      const value = draftRef.current;
      const id = await startWorkspace(value.questionText, value.files, value.id, value.expectedWorkspaceId);
      changeDraft({ workspaceId: id }, true);
      track('upload_succeeded', { durationMs: performance.now() - uploadStarted });
      const next = await fetchWorkspace();
      if (!next || next.workspaceId !== id) throw new Error('The workspace changed. Reload to continue.');
      setWorkspace(next);
      setUploading(false);
      if (next.brief) await openReport(next.draftId);
      else if (!next.analysis) await prepare(id, next);
    } catch (err) { track('upload_failed'); setError(message(err)); }
    finally { setUploading(false); }
  }
  async function next() {
    if (!workspaceId || !probing?.current || !selection || answering) return;
    setAnswering(true); setError(null);
    try {
      const durationMs = readProbeDurationMs(probing.current.id);
      const result = await answerProbe(probing.current.id, selection, workspaceId, hintOpened, durationMs);
      track('answer_saved', { probeId: probing.current.id, ...(durationMs !== undefined ? { durationMs } : {}) });
      changeDraft({ selectedProbeId: undefined, selection: undefined, hintOpened: false }, true);
      applyProbing(result);
    } catch (err) { setError(message(err)); await refresh().catch(() => {}); }
    finally { setAnswering(false); }
  }
  async function finish(omit = false) {
    if (!workspaceId || !draftRef.current || submitting || answering) return;
    setSubmitting(true); setError(null);
    track('finish_clicked');
    if (omit) track('export_omitted');
    changeDraft({ submissionId: draftRef.current.submissionId ?? crypto.randomUUID() }, true);
    let png: Blob | null = null;
    try {
      if (!omit) {
        try { if (!board.current) throw new Error('The drawing board is still loading.'); png = await board.current.exportPng(); }
        catch (err) { setExportFailed(true); track('export_failed'); throw err; }
      }
      const pendingDuration = probing?.current ? readProbeDurationMs(probing.current.id) : undefined;
      const brief = await submitBrief(
        png,
        workspaceId,
        draftRef.current.submissionId!,
        probing?.current && (selection || hintOpened)
          ? { probeId: probing.current.id, answer: selection ?? null, hintOpened, ...(pendingDuration !== undefined ? { durationMs: pendingDuration } : {}) }
          : undefined,
        omit,
      );
      track('brief_saved', { coreAnswered: brief.core.attempted, corePlanned: brief.core.total });
      if (selection && probing?.current) track('answer_saved', { probeId: probing.current.id });
      await openReport(draftRef.current.id);
    } catch (err) { setError(message(err)); setSubmitting(false); }
  }
  if (workspace?.brief) return <main className="min-h-screen bg-ground"><TutorBriefView workspace={workspace} brief={workspace.brief} /></main>;
  if (!loaded || !draft) return <main className="max-w-xl mx-auto p-8">{error ? <ErrorBanner message={error} onRetry={() => { setError(null); setLoadAttempt(n => n + 1); }} /> : <LoadingState label="Loading your workspace…" />}<a href="/workspace?new=1" className="text-brand-deep underline">New question</a></main>;
  return <main data-phase={submitting ? 'submitting' : uploading ? 'uploading' : viewFor(workspace)} className="flex h-[calc(100dvh-3rem)] flex-col bg-ground md:h-dvh">
    {storageError && <div className="px-3 pt-2"><ErrorBanner message={storageError} onRetry={() => void flush().catch(() => {})} /></div>}
    {error && <div className="px-3 pt-2"><ErrorBanner message={error} onRetry={() => void refresh().then(() => setError(null)).catch(err => setError(message(err)))} /></div>}
    {exportFailed && <div className="flex gap-3 px-3 py-2 text-sm"><span>Your drawing could not be attached.</span><button disabled={submitting} onClick={() => void finish()} className="text-brand-deep underline">Retry drawing export</button><button disabled={submitting} onClick={() => void finish(true)} className="text-brand-deep underline">Send without drawing</button></div>}
    <span role="status" className="sr-only">{probing?.current ? 'Your practice questions are ready.' : ''}</span>
    <div className="min-h-0 flex-1"><WorkspaceLayout
      questionTitle={probingPhase ? 'Practice questions' : 'Your problem'}
      whiteboard={<WhiteboardPanel ref={board} disabled={submitting} attachments={workspace?.attachments} initialBoard={initialBoard} onBoardChange={boardChanged} onFlush={() => void flush().catch(() => {})} />}
      questions={<div className="flex h-full min-h-0 flex-col gap-3">
        {!workspace && <div className="overflow-y-auto"><QuestionIntakeForm questionText={draft.questionText} files={draft.files} busy={uploading} onRejected={() => track('file_rejected')} onChange={(text, files) => { if (files.length > draft.files.length) track('files_added', { fileCount: files.length }); changeDraft({ questionText: text, files }); }} onBegin={() => void begin()} /></div>}
        {workspace && !workspace.analysis && <div className="overflow-y-auto space-y-3"><PreparationPanel failed={workspace.analysisStatus === 'failed'} working={preparing || workspace.analysisStatus === 'generating'} onRetry={() => void prepare(workspace.workspaceId)} /><QuestionDisplay questionText={workspace.questionText} parsedQuestionMarkdown={workspace.questionText || 'Your uploaded problem'} attachments={workspace.attachments} /></div>}
        {probingPhase && probing && <ProbingPanel
          heading={<><h1 className="page-title">Practice while you wait</h1><p className="text-sm text-muted">Use the whiteboard to work through each question. If you’re unsure, you can choose “I’m not sure.”</p></>}
          probing={probing} selection={selection} hintOpened={hintOpened}
          onVisible={probeVisible}
          onHintOpened={() => { track('hint_opened', { probeId: probing.current?.id }); changeDraft({ selectedProbeId: probing.current?.id, selection, hintOpened: true }, true); }}
          onSelect={(answer: ProbeAnswer) => changeDraft({ selectedProbeId: probing.current?.id, selection: answer, hintOpened }, true)}
          onNext={() => void next()}
          onRetry={prefetch}
          answering={answering}
          submitting={submitting}
          onSubmit={() => void finish()}
          submitLabel="DEMO: connect to tutor"
          submittingLabel="Connecting…"
        />}
      </div>} />
    </div>
  </main>;
}
