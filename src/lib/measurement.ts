/** Local, opt-in pilot telemetry. Never pass question content, names or answers here. */
export type PilotEventName = 'draft_opened' | 'files_added' | 'file_rejected' | 'begin_clicked'
  | 'upload_succeeded' | 'upload_failed' | 'analysis_started' | 'analysis_ready' | 'analysis_failed'
  | 'probe_ready' | 'probe_visible' | 'hint_opened' | 'answer_saved' | 'finish_clicked'
  | 'brief_saved' | 'brief_visible' | 'export_failed' | 'export_omitted'
  | 'draft_saved' | 'draft_restored' | 'draft_save_failed';
export interface PilotContext { attemptId: string; workspaceId?: string; mode: 'mock' | 'live' | 'reviewed-fixture' }
export interface PilotCounts { fileCount?: number; coreAnswered?: number; corePlanned?: number; durationMs?: number }
export interface PilotEvent extends PilotContext, PilotCounts {
  eventId: string; eventName: PilotEventName; viewId: string; sequence: number;
  elapsedMs: number; uiVersion: string; promptVersion: string; device: 'narrow' | 'wide';
}
const KEY = 'mathify-pilot-events-v1';
let viewId: string | undefined;
let sequence = 0;
export function recordPilotEvent(eventName: PilotEventName, context: PilotContext, counts: PilotCounts = {}): boolean {
  if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_MEASUREMENT_ENABLED !== 'true') return false;
  try {
    viewId ??= crypto.randomUUID();
    const event: PilotEvent = {
      eventId: crypto.randomUUID(), eventName, attemptId: context.attemptId,
      workspaceId: context.workspaceId, mode: context.mode, viewId, sequence: ++sequence,
      elapsedMs: performance.now(), uiVersion: 'pilot-v2', promptVersion: 'analysis-v3',
      device: window.innerWidth <= 900 ? 'narrow' : 'wide',
    };
    // An allowlist protects exported data even if a caller has extra runtime properties.
    for (const key of ['fileCount', 'coreAnswered', 'corePlanned', 'durationMs'] as const) {
      const value = counts[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) event[key] = value;
    }
    const events = readPilotEvents();
    // Never silently rotate away a failed attempt's start or denominator.
    if (events.length >= 10_000) return false;
    localStorage.setItem(KEY, JSON.stringify([...events, event]));
    return true;
  } catch { return false; }
}
export function readPilotEvents(): PilotEvent[] {
  const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  if (!Array.isArray(value)) throw new Error('Pilot event storage is invalid');
  return value as PilotEvent[];
}
export function clearPilotEvents() { localStorage.removeItem(KEY); }
