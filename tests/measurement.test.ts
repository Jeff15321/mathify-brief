// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { readPilotEvents, recordPilotEvent } from '@/lib/measurement';
afterEach(() => { localStorage.clear(); vi.unstubAllEnvs(); });
it('is disabled by default', () => {
  vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'false');
  expect(recordPilotEvent('begin_clicked', { attemptId: 'a', mode: 'mock' })).toBe(false);
  expect(readPilotEvents()).toEqual([]);
});
it('records distinct ordered events without accepting content fields', () => {
  vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true');
  const context = { attemptId: 'a', mode: 'mock' as const, questionText: 'private' };
  recordPilotEvent('begin_clicked', context, { fileCount: 2, durationMs: NaN });
  recordPilotEvent('upload_failed', context);
  const events = readPilotEvents();
  expect(events).toHaveLength(2);
  expect(events[0]).toMatchObject({ attemptId: 'a', fileCount: 2, mode: 'mock' });
  expect(JSON.stringify(events)).not.toContain('private');
  expect(events[0]).not.toHaveProperty('durationMs');
  expect(events[1].sequence).toBeGreaterThan(events[0].sequence);
  expect(new Set(events.map(e => e.eventId)).size).toBe(2);
});
