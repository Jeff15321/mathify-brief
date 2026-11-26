'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { IMAGE_MIME_TYPES, isImageMimeType } from '@/contracts/assets';
import { MAX_SESSION_WHITEBOARDS, MAX_TUTOR_NOTES_LENGTH, TRANSCRIPT_EXTENSIONS } from '@/contracts/limits';
import { uploadSession } from '@/client/sessions';
import { localToday } from '@/schemas/session';
import type { TutorSession } from '@/contracts/sessions';
import { FileAttachmentList } from '@/components/shared/FileAttachmentList';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const subscribeNever = () => () => {};
const FILE_INPUT = 'block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-wash file:px-4 file:py-2 file:text-sm file:font-bold file:text-ink hover:file:bg-pale';

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
    if (incoming.some(f => !isImageMimeType(f.type))) { setError('Whiteboards must be PNG, JPEG or WebP images. No images from this selection were added.'); return; }
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

  return <form ref={form} onSubmit={e => { e.preventDefault(); void submit(); }} className="flex flex-col gap-4 rounded-card border border-line bg-card p-4 sm:p-6">
    <h2 className="text-xl leading-tight font-bold text-ink">Upload a session</h2>
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4 disabled:opacity-60">
      <div className="space-y-1">
        <label htmlFor="sessionTranscript" className="block text-sm font-bold">Transcript</label>
        <input id="sessionTranscript" type="file" accept={TRANSCRIPT_EXTENSIONS.join(',')} onChange={e => setTranscript(e.target.files?.[0] ?? null)} className={FILE_INPUT} />
        <p className="text-sm text-muted">{TRANSCRIPT_EXTENSIONS.join(', ')} · up to 1 MB</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="sessionWhiteboards" className="block text-sm font-bold">Whiteboard images (optional)</label>
        <input id="sessionWhiteboards" type="file" multiple accept={IMAGE_MIME_TYPES.join(',')}
          onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ''; addWhiteboards(selected); }} className={FILE_INPUT} />
        <p className="text-sm text-muted">Up to {MAX_SESSION_WHITEBOARDS} PNG, JPEG or WebP images.</p>
        <FileAttachmentList files={whiteboards} onRemove={index => setWhiteboards(whiteboards.filter((_, i) => i !== index))} />
      </div>
      <div className="space-y-1">
        <label htmlFor="sessionDate" className="block text-sm font-bold">Session date</label>
        <input id="sessionDate" type="date" value={sessionDate || today} max={today || undefined} onChange={e => setSessionDate(e.target.value)} className="rounded-panel border border-connector bg-card p-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="tutorNotes" className="block text-sm font-bold">Tutor notes for this session (optional)</label>
        <textarea id="tutorNotes" value={tutorNotes} onChange={e => setTutorNotes(e.target.value)} rows={3} maxLength={MAX_TUTOR_NOTES_LENGTH} className="w-full rounded-panel border border-connector bg-card p-3 text-sm" />
      </div>
      {error && <ErrorBanner message={error} />}
      <button type="submit" className="rounded-full bg-pink px-6 py-3 text-sm font-bold text-card hover:bg-pink-deep">{busy ? 'Uploading and summarizing…' : 'Upload session'}</button>
    </fieldset>
  </form>;
}
