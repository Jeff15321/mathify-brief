'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { ALLOWED_MIME_TYPES, isAllowedMimeType } from '@/contracts/assets';
import { MAX_FILES, MAX_FILE_SIZE_BYTES, MAX_QUESTION_TEXT_LENGTH, MAX_TOTAL_SIZE_BYTES } from '@/contracts/limits';
import { FileAttachmentList } from '@/components/shared/FileAttachmentList';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { PURPOSE } from '@/components/workspace/PreparationPanel';
export function validateIntake(text: string, files: File[], requireInput = true): string | null {
  if (requireInput && !text.trim() && !files.length) return 'Type a question or add at least one photo or PDF.';
  if (text.length > MAX_QUESTION_TEXT_LENGTH) return 'The question text is too long.';
  if (files.length > MAX_FILES) return `You can add up to ${MAX_FILES} files. No files from this selection were added.`;
  if (files.some(f => !isAllowedMimeType(f.type))) return 'Use PNG, JPEG, WebP or PDF. No files from this selection were added.';
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
    <header>
      <div className="intake-header">
        <h1 className="page-title max-w-[12ch]">Get ready for <span className="text-pink">your tutor</span></h1>
        <Image src="/tutor-brief-cover.svg" alt="" width={456} height={288} className="intake-cover" />
      </div>
      <p className="max-w-prose text-base text-muted">{PURPOSE}</p>
    </header>
    <fieldset disabled={busy || adding} className="flex min-w-0 flex-col gap-4 disabled:opacity-60">
      <div className="space-y-2 rounded-card border border-dashed border-connector bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="fileInput" className="font-bold text-sm">Problem photos or PDFs</label>
          <span className="text-sm text-muted">{files.length === 0 ? 'No file chosen' : `${files.length} file${files.length === 1 ? '' : 's'} chosen`}</span>
        </div>
        <input ref={input} id="fileInput" type="file" multiple accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(selected); }} className="sr-only" />
        <button type="button" onClick={() => input.current?.click()} className="self-start text-sm font-bold text-pink-deep underline">Choose files</button>
        <FileAttachmentList files={files} onRemove={index => { setDuplicate(false); onChange(questionText, files.filter((_, i) => i !== index)); }}
          onMove={(index, direction) => { const next = [...files]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(questionText, next); }} />
      </div>
      {duplicate && <p role="status" className="text-sm text-ink">The same file appears more than once. Check the previews and remove any extra copy.</p>}
      <label htmlFor="questionText" className="text-sm font-bold">Question (optional if files provided)</label>
      <textarea id="questionText" value={questionText} onChange={e => onChange(e.target.value, files)} rows={3} maxLength={MAX_QUESTION_TEXT_LENGTH}
        placeholder="Type your question here, or add photos above." className="rounded-panel border border-connector bg-card p-3 text-sm" />
      <button type="submit" className="rounded-full bg-pink px-6 py-3 text-sm font-bold text-card hover:bg-pink-deep">{busy ? 'Saving your problem…' : adding ? 'Reading files…' : "Let’s begin"}</button>
    </fieldset>
    {error && <ErrorBanner message={error} />}
  </form>;
}
