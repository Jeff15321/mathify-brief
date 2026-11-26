'use client';
import { useRef, useState } from 'react';
import { ArrowRight, Paperclip } from 'lucide-react';
import { ALLOWED_MIME_TYPES, isAllowedMimeType } from '@/contracts/assets';
import { MAX_FILES, MAX_FILE_SIZE_BYTES, MAX_QUESTION_TEXT_LENGTH, MAX_TOTAL_SIZE_BYTES } from '@/contracts/limits';
import { FileAttachmentList } from '@/components/shared/FileAttachmentList';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const sampleQuestion = 'Solve 2(x + 3) = 14.';

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
  const question = useRef<HTMLTextAreaElement>(null);
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
  return <>
    <header className="page-heading">
      <h1 className="page-title">What are you working on?</h1>
      <p>Share your math problem. A few short checks help your tutor find a good place to start.</p>
    </header>
    <div className="study-grid">
      <form className="study-sheet" onSubmit={event => {
        event.preventDefault();
        const issue = validateIntake(questionText, files);
        setError(issue);
        if (issue) question.current?.focus();
        else onBegin();
      }} onDragOver={event => event.preventDefault()} onDrop={event => {
        event.preventDefault();
        void addFiles(Array.from(event.dataTransfer.files));
      }} onPaste={event => {
        if (event.clipboardData.files.length) {
          event.preventDefault();
          void addFiles(Array.from(event.clipboardData.files));
        }
      }}>
        <fieldset disabled={busy || adding} className="flex min-w-0 flex-col gap-5 disabled:opacity-60">
          <div>
            <label htmlFor="questionText" className="section-title block">Your question</label>
            <p className="field-help" id="question-help">Type it here, attach a photo or PDF, or do both.</p>
            <textarea ref={question} id="questionText" aria-describedby="question-help" value={questionText}
              onChange={event => { onChange(event.target.value, files); setError(null); }} rows={4}
              maxLength={MAX_QUESTION_TEXT_LENGTH} placeholder="What problem would you like help with?"
              className="question-input" />
          </div>
          <div>
            <input ref={input} type="file" aria-label="Problem photos or PDFs" multiple accept={ALLOWED_MIME_TYPES.join(',')}
              onChange={event => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; void addFiles(selected); }} hidden />
            <div className="attachment-row">
              <button type="button" onClick={() => input.current?.click()} className="action-secondary"><Paperclip size={16} aria-hidden />Attach files</button>
              <span className="text-sm text-muted">{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} chosen` : 'Or drag files here · up to 5'}</span>
            </div>
            <FileAttachmentList files={files} onRemove={index => onChange(questionText, files.filter((_, i) => i !== index))}
              onMove={(index, direction) => { const next = [...files]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(questionText, next); }} />
          </div>
          {duplicate && <p role="status" className="text-sm text-ink">The same file appears more than once. Check the previews and remove any extra copy.</p>}
          {error && <ErrorBanner message={error} />}
          <div className="sheet-footer">
            <button type="submit" className="action-primary">{busy ? 'Saving your problem…' : adding ? 'Reading files…' : 'Start warm-up'}<ArrowRight size={16} aria-hidden /></button>
          </div>
        </fieldset>
      </form>
      <aside className="sample-sheet" aria-labelledby="sample-heading">
        <div className="area-example" role="img" aria-label="Area model with height 2 and two widths, x and 3">
          <div className="area-figure" aria-hidden="true"><span className="area-height">2</span><span className="area-width">x</span><span className="area-width">3</span><span className="area-part">2x</span><span className="area-part">6</span></div>
        </div>
        <div className="p-5">
          <h2 className="section-title" id="sample-heading">Try a sample problem</h2>
          <p className="mt-1 text-muted">{sampleQuestion}</p>
          {(!questionText.trim() && !files.length) && <button className="action-link mt-3" type="button" disabled={busy || adding} onClick={() => {
            onChange(sampleQuestion, files); setError(null); question.current?.focus();
          }}>Use this problem <ArrowRight size={15} aria-hidden /></button>}
        </div>
      </aside>
    </div>
  </>;
}
