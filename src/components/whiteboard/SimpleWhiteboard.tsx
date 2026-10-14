"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 800;
const ASPECT_RATIO = LOGICAL_WIDTH / LOGICAL_HEIGHT;
const PEN_WIDTH = 4;
const ERASER_WIDTH = 28;

export interface SimpleWhiteboardHandle {
  exportPng(): Promise<Blob | null>;
}

type Tool = "pen" | "eraser";

function mapToLogicalCoords(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = LOGICAL_WIDTH / rect.width;
  const scaleY = LOGICAL_HEIGHT / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function fitContain(containerWidth: number, containerHeight: number): { width: number; height: number } {
  let width = containerWidth;
  let height = width / ASPECT_RATIO;
  if (height > containerHeight) {
    height = containerHeight;
    width = height * ASPECT_RATIO;
  }
  return { width, height };
}

function hasInk(ctx: CanvasRenderingContext2D): boolean {
  const { data } = ctx.getImageData(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return true;
  }
  return false;
}

export const SimpleWhiteboard = forwardRef<SimpleWhiteboardHandle, { disabled?: boolean }>(
  function SimpleWhiteboard({ disabled }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    const [tool, setTool] = useState<Tool>("pen");
    const [displaySize, setDisplaySize] = useState({ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT });

    // Keep the canvas's CSS box at the correct 3:2 aspect ratio ("contain"-fit within the
    // panel) instead of stretching width:100%/height:100% independently, which skews ink
    // non-uniformly whenever the panel's own aspect ratio changes (e.g. on expand/restore).
    // useLayoutEffect (not useEffect) + a synchronous initial measurement avoid ever painting
    // a frame at the full 1200x800 fallback size, which would otherwise race with
    // ResizeObserver's asynchronous first callback and let an early stroke land on a
    // wrongly-scaled canvas.
    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDisplaySize(fitContain(rect.width, rect.height));
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width: containerWidth, height: containerHeight } = entry.contentRect;
        if (containerWidth <= 0 || containerHeight <= 0) return;
        setDisplaySize(fitContain(containerWidth, containerHeight));
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    useImperativeHandle(ref, () => ({
      async exportPng() {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext("2d");
        if (!ctx || !hasInk(ctx)) return null;

        const flattened = document.createElement("canvas");
        flattened.width = LOGICAL_WIDTH;
        flattened.height = LOGICAL_HEIGHT;
        const flatCtx = flattened.getContext("2d")!;
        flatCtx.fillStyle = "#ffffff";
        flatCtx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        flatCtx.drawImage(canvas, 0, 0);

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

      const { x, y } = mapToLogicalCoords(e, canvas);
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

      const { x, y } = mapToLogicalCoords(e, canvas);
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
          className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-200"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundColor: "#ffffff",
          }}
        >
          <canvas
            ref={canvasRef}
            width={LOGICAL_WIDTH}
            height={LOGICAL_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: `${displaySize.width}px`,
              height: `${displaySize.height}px`,
              touchAction: "none",
              display: "block",
            }}
          />
        </div>
      </div>
    );
  },
);
