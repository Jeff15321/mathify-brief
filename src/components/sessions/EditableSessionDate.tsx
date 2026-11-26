'use client';
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { localToday } from '@/schemas/session';
import { Card } from '@/components/shared/Card';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

/** Inline date input; Save is enabled once the date changes. */
export function EditableSessionDate({ date, onSave }: { date: string; onSave: (date: string) => Promise<void> }) {
  const [value, setValue] = useState(date);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    try { await onSave(value); }
    catch (err) { setError(err instanceof Error ? err.message : 'The date could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  return <Card title={<label htmlFor="sessionDate">Session date</label>} icon={<CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />}>
    <form onSubmit={e => { e.preventDefault(); void save(); }} className="flex flex-wrap items-center gap-2">
      <input id="sessionDate" type="date" required value={value} max={localToday()} disabled={busy} onChange={e => setValue(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm disabled:opacity-60" />
      <button type="submit" disabled={busy || !value || value === date} className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
    </form>
    {error && <ErrorBanner message={error} />}
  </Card>;
}
