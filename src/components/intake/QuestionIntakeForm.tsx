"use client";

import { useCallback, useState } from "react";
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

/**
 * A file input that always works, even on repeated clicks.
 *
 * The trick: every time a selection is made, we bump a key counter. React
 * unmounts the old <input> and mounts a fresh one, so the browser can never
 * get confused about "same value, no change" and the picker always opens.
 */
function AlwaysFreshFileInput({
  onChange,
  disabled,
}: {
  onChange: (files: FileList) => void;
  disabled?: boolean;
}) {
  const [key, setKey] = useState(0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onChange(e.target.files);
    }
    // Bump key to force a fresh <input> on next render
    setKey((k) => k + 1);
  }

  return (
    <input
      key={key}
      type="file"
      multiple
      accept={ACCEPT}
      disabled={disabled}
      onChange={handleChange}
      className="sr-only"
    />
  );
}

export function QuestionIntakeForm() {
  const router = useRouter();
  const [questionText, setQuestionText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Track whether the file picker is open so we can prevent duplicate inputs
  const [pickerActive, setPickerActive] = useState(false);

  const busy = status !== "idle";

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    setFiles((prev) => {
      const combined = [...prev, ...Array.from(newFiles)];
      return combined.slice(0, MAX_FILES);
    });
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

  /** Opens a file picker by creating a temporary input element. */
  function openFilePicker() {
    if (busy || pickerActive) return;
    setPickerActive(true);
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ACCEPT;
    input.onchange = () => {
      if (input.files) addFiles(input.files);
      setPickerActive(false);
    };
    input.oncancel = () => {
      setPickerActive(false);
    };
    input.click();
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

        {/* Drop zone — click opens a fresh temp file picker each time */}
        <div
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFilePicker(); }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
          } ${busy || pickerActive ? "pointer-events-none opacity-50" : ""}`}
        >
          <Upload size={28} className="text-slate-400" />
          <p className="text-sm text-slate-600">
            Drag & drop images or PDFs here, or <span className="font-medium text-blue-600">click to browse</span>
          </p>
          <p className="text-xs text-slate-400">
            PNG, JPEG, WebP, or PDF · up to {MAX_FILES} files
          </p>
        </div>

        {/* Show attached files + add more button */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <FileAttachmentList files={files} onRemove={removeFile} />
            {files.length < MAX_FILES && (
              <button
                type="button"
                disabled={busy || pickerActive}
                onClick={openFilePicker}
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
