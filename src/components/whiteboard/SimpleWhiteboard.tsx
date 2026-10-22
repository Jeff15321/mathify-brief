"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

// Stroke widths in CSS pixels (the canvas is drawn 1:1 with the screen, so ink never rescales).
const PEN_WIDTH = 2.5;
const ERASER_WIDTH = 16;
// Cap the backing-store resolution so high-DPI screens don't create huge bitmaps.
const MAX_PIXEL_RATIO = 2;

/** Pointer position relative to the canvas's top-left corner, in CSS pixels. */
function toSurfaceCoords(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

export interface SimpleWhiteboardHandle {
  exportPng(): Promise<Blob | null>;
}

type Tool = "pen" | "eraser";

function hasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return true;
  }
  return false;
}

/**
 * Pen/eraser whiteboard whose canvas fills the whole visible drawing area.
 *
 * The canvas is drawn 1:1 in CSS pixels, so ink is never stretched or rescaled when the panel
 * resizes. Its bitmap only grows: a larger panel extends the surface and keeps existing ink, while
 * a smaller one clips the overflow (it reappears when the panel grows again).
 */
export const SimpleWhiteboard = forwardRef<SimpleWhiteboardHandle, { disabled?: boolean }>(
  function SimpleWhiteboard({ disabled }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    // Drawing surface size in CSS pixels, and the pixel ratio fixed at mount.
    const surfaceRef = useRef({ width: 0, height: 0, pixelRatio: 1 });
    const [tool, setTool] = useState<Tool>("pen");

    /** Grows the drawing surface to at least the given CSS size, preserving existing ink. */
    function ensureSurfaceSize(minWidth: number, minHeight: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const surface = surfaceRef.current;
      const width = Math.max(surface.width, Math.ceil(minWidth));
      const height = Math.max(surface.height, Math.ceil(minHeight));
      if (width === surface.width && height === surface.height) return;

      // Resizing a canvas clears it, so snapshot the current ink first.
      let snapshot: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        snapshot = document.createElement("canvas");
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext("2d")!.drawImage(canvas, 0, 0);
      }

      canvas.width = Math.round(width * surface.pixelRatio);
      canvas.height = Math.round(height * surface.pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (snapshot) canvas.getContext("2d")!.drawImage(snapshot, 0, 0);

      surfaceRef.current = { ...surface, width, height };
    }

    // useLayoutEffect sizes the surface before the first paint, so an early stroke never lands
    // on an unsized canvas; ResizeObserver then grows it as the panel expands.
    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      surfaceRef.current.pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      ensureSurfaceSize(container.clientWidth, container.clientHeight);

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        ensureSurfaceSize(entry.contentRect.width, entry.contentRect.height);
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    useImperativeHandle(ref, () => ({
      async exportPng() {
        const canvas = canvasRef.current;
        if (!canvas || !hasInk(canvas)) return null;

        // Flatten ink over white at CSS-pixel size (the surface the student actually drew on).
        const { width, height } = surfaceRef.current;
        const flattened = document.createElement("canvas");
        flattened.width = width;
        flattened.height = height;
        const flatCtx = flattened.getContext("2d")!;
        flatCtx.fillStyle = "#ffffff";
        flatCtx.fillRect(0, 0, width, height);
        flatCtx.drawImage(canvas, 0, 0, width, height);

        return new Promise((resolve) => {
          flattened.toBlob((blob) => resolve(blob), "image/png");
        });
      },
    }));

    function getContext(): CanvasRenderingContext2D | null {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d");
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      if (disabled) return;
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;

      canvas.setPointerCapture(e.pointerId);
      drawingRef.current = true;

      const { x, y } = toSurfaceCoords(e, canvas);
      const { pixelRatio } = surfaceRef.current;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = tool === "eraser" ? ERASER_WIDTH : PEN_WIDTH;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (disabled || !drawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;

      const { x, y } = toSurfaceCoords(e, canvas);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
      drawingRef.current = false;
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }

    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTool("pen")}
            aria-pressed={tool === "pen"}
            disabled={disabled}
            className={`rounded-md border px-3 py-1 text-sm ${tool === "pen" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-700 bg-white"}`}
          >
            Pen
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            aria-pressed={tool === "eraser"}
            disabled={disabled}
            className={`rounded-md border px-3 py-1 text-sm ${tool === "eraser" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-700 bg-white"}`}
          >
            Eraser
          </button>
        </div>
        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Sized imperatively by ensureSurfaceSize; anchored top-left so it covers the whole area. */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute left-0 top-0 block"
            style={{ touchAction: "none" }}
          />
        </div>
      </div>
    );
  },
);
