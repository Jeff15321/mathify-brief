"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 800;
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
    const drawingRef = useRef(false);
    const [tool, setTool] = useState<Tool>("pen");

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
          className="relative flex-1 overflow-hidden rounded-lg border border-slate-200"
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
            style={{ width: "100%", height: "100%", touchAction: "none", display: "block" }}
          />
        </div>
      </div>
    );
  },
);
