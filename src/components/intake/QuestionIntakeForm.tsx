'use client';
import { useRef, useState } from 'react';
import { MAX_FILES, MAX_FILE_SIZE_BYTES, MAX_QUESTION_TEXT_LENGTH, MAX_TOTAL_SIZE_BYTES } from '@/lib/constants';
import { FileAttachmentList } from './FileAttachmentList';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { PURPOSE } from '@/components/workspace/PreparationPanel';
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export function validateIntake(text: string, files: File[], requireInput = true): string | null {
  if (requireInput && !text.trim() && !files.length) return 'Type a question or add at least one photo or PDF.';
  if (text.length > MAX_QUESTION_TEXT_LENGTH) return 'The question text is too long.';
  if (files.length > MAX_FILES) return `You can add up to ${MAX_FILES} files. No files from this selection were added.`;
  if (files.some(f => !TYPES.includes(f.type))) return 'Use PNG, JPEG, WebP or PDF. No files from this selection were added.';
  if (files.some(f => f.size > MAX_FILE_SIZE_BYTES)) return 'Each file must be 10 MB or smaller. No files from this selection were added.';
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_SIZE_BYTES) return 'Keep the combined files under 20 MB. No files from this selection were added.';
  return null;
}
export function QuestionIntakeForm({ questionText, files, onChange, onBegin, busy, onRejected }: {
  questionText: string; files: File[]; onChange: (text: string, files: File[]) => void; onBegin: () => void; busy: boolean; onRejected?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  async function addFiles(incoming: File[]) {
    if (busy || addingRef.current || !incoming.length) return;
    const next = [...files, ...incoming];
    const issue = validateIntake(questionText, next, false);
    if (issue) { setError(issue); onRejected?.(); return; }
    addingRef.current = true; setAdding(true); setError(null);
    try {
      const hashes = await Promise.all(next.map(async f => {
        const hash = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
        return Array.from(new Uint8Array(hash)).join(',');
      }));
      setDuplicate(new Set(hashes).size < hashes.length);
      onChange(questionText, next);
    } catch { setError('These files could not be read. Please select them again.'); }
    finally { addingRef.current = false; setAdding(false); }
  }
  return <form onSubmit={e => { e.preventDefault(); const issue = validateIntake(questionText, files); setError(issue); if (!issue) onBegin(); }}
    onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void addFiles(Array.from(e.dataTransfer.files)); }}
    onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); void addFiles(Array.from(e.clipboardData.files)); } }} className="flex flex-col gap-4">
    <div><h1 className="text-xl font-semibold text-slate-900">Get ready for your tutor</h1><p className="mt-2 text-sm text-slate-700">{PURPOSE}</p></div>
    <fieldset disabled={busy || adding} className="flex min-w-0 flex-col gap-4 disabled:opacity-60">
      <div className="space-y-2 rounded-xl border-2 border-dashed border-blue-200 bg-white p-4">
        <label htmlFor="fileInput" className="block font-medium text-sm">Problem photos or PDFs</label>
        <p className="text-sm text-slate-600">Select several at once, drop them here, or paste images. Include all pages of one problem.</p>
        <input ref={input} id="fileInput" type="file" multiple accept={TYPES.join(',')}
          onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(selected); }} className="block w-full text-sm" />
        <p className="text-xs text-slate-500">Up to 5 files · 10 MB each · 20 MB total. PDFs open separately from the drawing board.</p>
        <FileAttachmentList files={files} onRemove={index => { setDuplicate(false); onChange(questionText, files.filter((_, i) => i !== index)); }}
          onMove={(index, direction) => { const next = [...files]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(questionText, next); }} />
      </div>
      {duplicate && <p role="status" className="text-sm text-amber-800">The same file appears more than once. Check the previews and remove any extra copy.</p>}
      <label htmlFor="questionText" className="text-sm font-medium">Question (optional if files provided)</label>
      <textarea id="questionText" value={questionText} onChange={e => onChange(e.target.value, files)} rows={3} maxLength={MAX_QUESTION_TEXT_LENGTH}
        placeholder="Type your question here, or add photos above." className="rounded-lg border border-slate-300 bg-white p-3 text-sm" />
      <button type="submit" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">{busy ? 'Saving your problem…' : adding ? 'Reading files…' : "Let’s begin"}</button>
    </fieldset>
    {error && <ErrorBanner message={error} />}
  </form>;
}
