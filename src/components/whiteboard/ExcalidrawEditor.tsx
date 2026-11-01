"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import "@excalidraw/excalidraw/index.css";
import {
  CaptureUpdateAction,
  Excalidraw,
  MainMenu,
  convertToExcalidrawElements,
  exportToBlob,
  getDataURL,
} from "@excalidraw/excalidraw";
import type { BinaryFileData, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { FileId } from "@excalidraw/excalidraw/element/types";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { MAX_WHITEBOARD_SIZE_BYTES } from "@/lib/constants";
import type { SimpleWhiteboardHandle, WhiteboardProps } from "./SimpleWhiteboard";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH: string;
  }
}

// Keep fonts local, including when the editor exports text to a PNG.
window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
const NO_IMAGES: NonNullable<WhiteboardProps["backgroundImages"]> = [];

export default function ExcalidrawEditor({
  disabled,
  backgroundImages = NO_IMAGES,
  boardRef,
}: WhiteboardProps & { boardRef: Ref<SimpleWhiteboardHandle> }) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadedImageIds, setLoadedImageIds] = useState<string[]>([]);
  const loadingImages = !error && backgroundImages.some((image) => !loadedImageIds.includes(image.id));
  const importedIds = useRef(new Set<string>());
  const importing = useRef(false);
  const importFailed = useRef(false);

  useEffect(() => {
    if (!api) return;
    const editor = api;
    let cancelled = false;
    const controller = new AbortController();
    importing.current = true;
    importFailed.current = false;

    async function importImages() {
      let importedAny = false;
      for (const image of backgroundImages) {
        if (importedIds.current.has(image.id)) continue;
        const response = await fetch(image.url, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load an uploaded image onto the whiteboard.");
        const blob = await response.blob();
        const mimeType = blob.type;
        if (mimeType !== "image/png" && mimeType !== "image/jpeg" && mimeType !== "image/webp") {
          throw new Error("An uploaded whiteboard image has an unsupported format.");
        }
        const bitmap = await createImageBitmap(blob);
        const width = Math.min(500, bitmap.width);
        const height = width * bitmap.height / bitmap.width;
        bitmap.close();
        const dataURL = await getDataURL(blob);
        if (cancelled) return;
        // Asset IDs become Excalidraw's branded binary-file IDs at this boundary.
        const file: BinaryFileData = {
          id: image.id as FileId,
          dataURL,
          mimeType,
          created: Date.now(),
        };
        editor.addFiles([file]);
        const existing = editor.getSceneElements();
        const y = existing.reduce((bottom, element) => Math.max(bottom, element.y + element.height), 0) + 40;
        const elements = convertToExcalidrawElements([{
          type: "image",
          fileId: file.id,
          x: 40,
          y,
          width,
          height,
          status: "saved",
        }]);
        editor.updateScene({ elements: [...existing, ...elements], captureUpdate: CaptureUpdateAction.NEVER });
        importedIds.current.add(image.id);
        importedAny = true;
      }
      if (!cancelled) {
        importing.current = false;
        if (importedAny) setLoadedImageIds([...importedIds.current]);
        setError(null);
        if (importedAny) editor.scrollToContent(undefined, { fitToViewport: true });
      }
    }

    void importImages().catch((err: unknown) => {
      if (cancelled) return;
      importing.current = false;
      importFailed.current = true;
      setError(err instanceof Error ? err.message : "Could not load uploaded images.");
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, backgroundImages, attempt]);

  useImperativeHandle(boardRef, () => ({
    async exportPng() {
      if (!api || importing.current) throw new Error("The whiteboard is still loading. Please try again.");
      if (importFailed.current) throw new Error("Retry loading the uploaded images before submitting.");
      const elements = api.getSceneElements();
      if (!elements.length) return null;
      const blob = await exportToBlob({
        elements,
        files: api.getFiles(),
        appState: { ...api.getAppState(), exportBackground: true, viewBackgroundColor: "#ffffff", exportEmbedScene: false },
        mimeType: "image/png",
        maxWidthOrHeight: 1600,
      });
      if (blob.size > MAX_WHITEBOARD_SIZE_BYTES) {
        throw new Error("The whiteboard image is too large. Remove some images and try again.");
      }
      return blob;
    },
  }), [api]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <p>Try working here while you wait. Use Draw, Text, or Insert image.</p>
        <button
          type="button"
          disabled={!api || disabled || loadingImages}
          onClick={() => api?.scrollToContent(undefined, { fitToViewport: true })}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
        >
          Fit to work
        </button>
      </div>
      {loadingImages && <p role="status" className="text-xs text-slate-600">Loading uploaded images…</p>}
      {error && <ErrorBanner message={error} onRetry={() => {
        setError(null);
        setAttempt((value) => value + 1);
      }} />}
      <div className="min-h-0 flex-1" aria-label="Drawing whiteboard">
        <Excalidraw
          excalidrawAPI={setApi}
          initialData={{ appState: { viewBackgroundColor: "#ffffff", currentItemFontFamily: 2 } }}
          viewModeEnabled={disabled}
          theme="light"
          handleKeyboardGlobally={false}
          autoFocus={false}
          aiEnabled={false}
          validateEmbeddable={false}
          UIOptions={{ canvasActions: { export: false, saveAsImage: false, toggleTheme: false, loadScene: false } }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas />
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );
}
