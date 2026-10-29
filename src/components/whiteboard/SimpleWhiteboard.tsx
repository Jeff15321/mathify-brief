"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

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
 *
 * Background images are rendered as a CSS background on the container (never on the canvas itself),
 * so they never interfere with ink or get duplicated on resize.
 */
export const SimpleWhiteboard = forwardRef<SimpleWhiteboardHandle, { disabled?: boolean; backgroundImages?: Array<{ id: string; url: string }> }>(
  function SimpleWhiteboard({ disabled, backgroundImages = [] }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    // Drawing surface size in CSS pixels, and the pixel ratio fixed at mount.
    const surfaceRef = useRef({ width: 0, height: 0, pixelRatio: 1 });
    const [tool, setTool] = useState<Tool>("pen");
    // Background image state
    const [activeBgId, setActiveBgId] = useState<string | null>(backgroundImages[0]?.id ?? null);

    // Stable serialized key to avoid re-running on array reference changes
    const bgKey = backgroundImages.map((bg) => `${bg.id}:${bg.url}`).join("|");

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
      // Restore ink — background is handled by CSS, never drawn on the canvas
      if (snapshot) canvas.getContext("2d")!.drawImage(snapshot, 0, 0);

      surfaceRef.current = { ...surface, width, height };
    }

    // Set initial active background when the list changes
    useEffect(() => {
      if (backgroundImages.length > 0 && !backgroundImages.find((bg) => bg.id === activeBgId)) {
        setActiveBgId(backgroundImages[0].id);
      }
    }, [bgKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

        // Flatten: white background + background image + ink
        const { width, height, pixelRatio } = surfaceRef.current;
        const flattened = document.createElement("canvas");
        flattened.width = width;
        flattened.height = height;
        const flatCtx = flattened.getContext("2d")!;
        flatCtx.fillStyle = "#ffffff";
        flatCtx.fillRect(0, 0, width, height);

        // Draw background image at 30% opacity for export
        const activeBg = backgroundImages.find((bg) => bg.id === activeBgId);
        if (activeBg) {
          const img = await loadImage(activeBg.url);
          if (img) {
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const canvasAspect = width / height;
            let drawW: number, drawH: number, drawX: number, drawY: number;
            if (imgAspect > canvasAspect) {
              drawW = width;
              drawH = width / imgAspect;
              drawX = 0;
              drawY = (height - drawH) / 2;
            } else {
              drawH = height;
              drawW = height * imgAspect;
              drawX = (width - drawW) / 2;
              drawY = 0;
            }
            flatCtx.globalAlpha = 0.3;
            flatCtx.drawImage(img, drawX, drawY, drawW, drawH);
            flatCtx.globalAlpha = 1;
          }
        }
        flatCtx.drawImage(canvas, 0, 0, width, height);

        return new Promise((resolve) => {
          flattened.toBlob((blob) => resolve(blob), "image/png");
        });
      },
    }));

    /** Load an image from URL, returning the HTMLImageElement (or null on failure). */
    function loadImage(url: string): Promise<HTMLImageElement | null> {
      return new Promise((resolve) => {
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }

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

    // Build CSS background for the active image
    const activeBg = backgroundImages.find((bg) => bg.id === activeBgId);
    const containerBgStyle: React.CSSProperties = activeBg
      ? {
          backgroundImage: `url(${activeBg.url})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          // Low opacity via a pseudo-overlay approach: we use a slightly transparent
          // background-color overlay via the dot grid, which naturally dims the image.
          // Instead, let's use an opacity approach on a wrapper.
        }
      : {
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          backgroundColor: "#ffffff",
        };

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
          {backgroundImages.length > 1 && (
            <div className="ml-auto flex gap-1">
              {backgroundImages.map((bg, i) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setActiveBgId(bg.id)}
                  disabled={disabled}
                  className={`rounded border px-2 py-0.5 text-[11px] font-medium ${activeBgId === bg.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"}`}
                  title={`File ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Wrapper handles the background image with opacity control */}
        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200"
          style={{ backgroundColor: "#ffffff" }}
        >
          {/* Background image layer with opacity */}
          {activeBg && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${activeBg.url})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
                opacity: 0.3,
              }}
            />
          )}
          {/* Dot grid (always visible, on top of background) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
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
