'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { MAX_SESSION_WHITEBOARDS, MAX_TUTOR_NOTES_LENGTH, TRANSCRIPT_EXTENSIONS } from '@/lib/constants';
import { uploadSession } from '@/lib/api-client';
import { localToday } from '@/schemas/session';
import type { TutorSession } from '@/types/domain';
import { FileAttachmentList } from '@/components/intake/FileAttachmentList';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const subscribeNever = () => () => {};

export function SessionUploadForm({ onUploaded }: { onUploaded: (session: TutorSession) => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [whiteboards, setWhiteboards] = useState<File[]>([]);
  // The page is prerendered, so "today" is read on the client only; an empty date means today.
  const today = useSyncExternalStore(subscribeNever, localToday, () => '');
  const [sessionDate, setSessionDate] = useState('');
  const [tutorNotes, setTutorNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addWhiteboards(incoming: File[]) {
    if (whiteboards.length + incoming.length > MAX_SESSION_WHITEBOARDS) { setError(`You can add up to ${MAX_SESSION_WHITEBOARDS} whiteboard images. No images from this selection were added.`); return; }
    if (incoming.some(f => !IMAGE_TYPES.includes(f.type))) { setError('Whiteboards must be PNG, JPEG or WebP images. No images from this selection were added.'); return; }
    setError(null);
    setWhiteboards([...whiteboards, ...incoming]);
  }
  async function submit() {
    if (!transcript) { setError('Choose a transcript file.'); return; }
    setBusy(true); setError(null);
    const data = new FormData();
    data.set('transcript', transcript);
    for (const file of whiteboards) data.append('whiteboards', file);
    data.set('sessionDate', sessionDate);
    data.set('tutorNotes', tutorNotes);
    try {
      const session = await uploadSession(data);
      form.current?.reset();
      setTranscript(null); setWhiteboards([]); setSessionDate(''); setTutorNotes('');
      onUploaded(session);
    } catch (err) { setError(err instanceof Error ? err.message : 'The session could not be uploaded. Please try again.'); }
    finally { setBusy(false); }
  }

  return <form ref={form} onSubmit={e => { e.preventDefault(); void submit(); }} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-900">Upload a session</h2>
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4 disabled:opacity-60">
      <div className="space-y-1">
        <label htmlFor="sessionTranscript" className="block text-sm font-medium">Transcript</label>
        <input id="sessionTranscript" type="file" accept={TRANSCRIPT_EXTENSIONS.join(',')} onChange={e => setTranscript(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
        <p className="text-xs text-slate-500">{TRANSCRIPT_EXTENSIONS.join(', ')} · up to 1 MB</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="sessionWhiteboards" className="block text-sm font-medium">Whiteboard images (optional)</label>
        <input id="sessionWhiteboards" type="file" multiple accept={IMAGE_TYPES.join(',')}
          onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ''; addWhiteboards(selected); }} className="block w-full text-sm" />
        <p className="text-xs text-slate-500">Up to {MAX_SESSION_WHITEBOARDS} PNG, JPEG or WebP images.</p>
        <FileAttachmentList files={whiteboards} onRemove={index => setWhiteboards(whiteboards.filter((_, i) => i !== index))} />
      </div>
      <div className="space-y-1">
        <label htmlFor="sessionDate" className="block text-sm font-medium">Session date</label>
        <input id="sessionDate" type="date" value={sessionDate || today} max={today || undefined} onChange={e => setSessionDate(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="tutorNotes" className="block text-sm font-medium">Tutor notes for this session (optional)</label>
        <textarea id="tutorNotes" value={tutorNotes} onChange={e => setTutorNotes(e.target.value)} rows={3} maxLength={MAX_TUTOR_NOTES_LENGTH} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
      </div>
      {error && <ErrorBanner message={error} />}
      <button type="submit" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">{busy ? 'Uploading and summarizing…' : 'Upload session'}</button>
    </fieldset>
  </form>;
}
