"use client";

import { useRef, useState } from "react";
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

  const busy = status !== "idle";

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
        <label htmlFor="fileInput" className="text-sm font-medium">
          Upload files
        </label>
        <input
          ref={inputRef}
          id="fileInput"
          type="file"
          multiple
          accept={ACCEPT}
          disabled={busy}
          onChange={(e) => addFiles(e.target.files)}
          className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <FileAttachmentList files={files} onRemove={removeFile} />
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
