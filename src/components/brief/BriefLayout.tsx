"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

/**
 * Two-panel layout for the Tutor Brief page: whiteboard/attachments on the
 * left, expandable report on the right. On narrow screens, the whiteboard
 * is hidden behind a toggle button.
 */
export function BriefLayout({
  whiteboard,
  report,
  whiteboardAssetId,
  attachments,
}: {
  whiteboard: ReactNode;
  report: ReactNode;
  whiteboardAssetId: string | null;
  attachments: { id: string; fileName: string; mimeType: string }[];
}) {
  const [narrow, setNarrow] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 900px)");
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Determine what to show on the left panel
  const hasWhiteboard = !!whiteboardAssetId;
  const imageAttachments = attachments.filter((a) =>
    ["image/png", "image/jpeg", "image/webp"].includes(a.mimeType),
  );
  const leftImageId = hasWhiteboard ? whiteboardAssetId : imageAttachments[0]?.id ?? null;

  if (narrow) {
    return (
      <div className="relative min-h-screen bg-slate-50">
        {/* Floating toggle for whiteboard */}
        {leftImageId && (
          <>
            <button
              type="button"
              onClick={() => setShowWhiteboard((v) => !v)}
              className="fixed bottom-4 left-4 z-20 rounded-full bg-white p-2.5 shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
            >
              {showWhiteboard ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            {showWhiteboard && (
              <div className="fixed inset-0 z-10 bg-black/30" onClick={() => setShowWhiteboard(false)}>
                <div
                  className="absolute left-0 top-0 bottom-0 w-[70%] max-w-md bg-white p-4 overflow-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/assets/${leftImageId}`}
                    alt="Student work"
                    className="w-full rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              </div>
            )}
          </>
        )}
        <div className="p-4 sm:p-6">{report}</div>
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-cols-[55fr_45fr] bg-slate-50">
      {/* Left panel: whiteboard image or question attachments */}
      <div className="flex flex-col overflow-hidden border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
          <h2 className="text-sm font-semibold text-slate-700">
            {hasWhiteboard ? "Student's whiteboard" : "Question attachments"}
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {leftImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/assets/${leftImageId}`}
              alt={hasWhiteboard ? "Student's whiteboard" : "Question attachment"}
              className="mx-auto max-h-full rounded-lg border border-slate-200 object-contain"
            />
          ) : (
            <p className="text-sm text-slate-500">No whiteboard work or attachments.</p>
          )}
        </div>
      </div>
      {/* Right panel: scrollable report */}
      <div className="overflow-auto p-4 sm:p-6">{report}</div>
    </div>
  );
}
