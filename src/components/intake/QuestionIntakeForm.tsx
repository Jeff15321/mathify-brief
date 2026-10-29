"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeQuestion, ApiClientError, startWorkspace } from "@/lib/api-client";
import {
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_TOTAL_SIZE_BYTES,
} from "@/lib/constants";
import { FileAttachmentList } from "./FileAttachmentList";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { LoadingState } from "@/components/shared/LoadingState";
import { Upload, Plus } from "lucide-react";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";

function validateClientSide(questionText: string, files: File[]): string | null {
  if (questionText.trim().length === 0 && files.length === 0) {
    return "Type a question or attach at least one file.";
  }
  if (questionText.length > MAX_QUESTION_TEXT_LENGTH) {
    return `Question text must be at most ${MAX_QUESTION_TEXT_LENGTH} characters.`;
  }
  if (files.length > MAX_FILES) {
    return `At most ${MAX_FILES} files are allowed.`;
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_SIZE_BYTES) {
    return "Combined file size is too large.";
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `${file.name} is too large (max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB per file).`;
    }
  }
  return null;
}

export function QuestionIntakeForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [questionText, setQuestionText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const busy = status !== "idle";

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    setFiles((prev) => {
      const combined = [...prev, ...Array.from(newFiles)];
      // Enforce max files
      return combined.slice(0, MAX_FILES);
    });
    // Reset the file input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!busy) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  async function runAnalysis() {
    setStatus("analyzing");
    try {
      await analyzeQuestion();
      router.push("/workspace");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? `Analysis failed: ${err.message}`
          : "Analysis failed. Please try again.",
      );
      setStatus("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clientError = validateClientSide(questionText, files);
    if (clientError) {
      setError(clientError);
      return;
    }

    setStatus("uploading");
    try {
      await startWorkspace(questionText, files);
      await runAnalysis();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not start your session. Please try again.",
      );
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="questionText" className="text-sm font-medium">
          Question (optional if files provided)
        </label>
        <textarea
          id="questionText"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          disabled={busy}
          rows={5}
          maxLength={MAX_QUESTION_TEXT_LENGTH}
          placeholder="e.g. Solve $2(x + 3) = 14$."
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <p className="text-xs text-slate-500">
          Submit one math question only. You may attach multiple images/PDFs of that same
          question and any work you tried.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Upload files</label>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !busy && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
          } ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          <Upload size={28} className="text-slate-400" />
          <p className="text-sm text-slate-600">
            Drag & drop images or PDFs here, or <span className="font-medium text-blue-600">click to browse</span>
          </p>
          <p className="text-xs text-slate-400">
            PNG, JPEG, WebP, or PDF · up to {MAX_FILES} files
          </p>
        </div>

        {/* Visually hidden file input — triggered by the drop zone or the Add More button.
            Uses sr-only instead of hidden so .click() works reliably across browsers
            (display:none inputs may not open the file picker on subsequent clicks). */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />

        {/* Show attached files + add more button */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <FileAttachmentList files={files} onRemove={removeFile} />
            {files.length < MAX_FILES && (
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus size={14} />
                Add more files
              </button>
            )}
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {status === "analyzing" && <LoadingState label="Analyzing your question…" />}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : status === "analyzing" ? "Analyzing…" : "Begin Session"}
      </button>
    </form>
  );
}
