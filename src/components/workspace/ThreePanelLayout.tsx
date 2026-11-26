"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, PencilLine, X } from "lucide-react";

type PanelKey = "whiteboard" | "probing";

const PANEL_TITLES: Record<PanelKey, string> = {
  whiteboard: "Whiteboard",
  probing: "Relevant Concepts",
};

const PANEL_ORDER: PanelKey[] = ["whiteboard", "probing"];
const BASE_FR: Record<PanelKey, number> = { whiteboard: 50, probing: 50 };
const EXPANDED_FR = 70;
const SHRUNK_FR = 30;

function useIsNarrow(breakpointPx: number) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpointPx]);
  return narrow;
}

function PanelHeader({
  panel,
  expanded,
  onToggle,
}: {
  panel: PanelKey;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-card px-3 py-2">
      <h2 className="min-w-0 truncate text-sm font-bold text-ink">{PANEL_TITLES[panel]}</h2>
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? `Restore ${PANEL_TITLES[panel]}` : `Expand ${PANEL_TITLES[panel]}`}
        className="rounded p-1 text-muted hover:bg-fill"
      >
        {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );
}

/**
 * Workspace layout. Split mode: Whiteboard (left) and Relevant Concepts (right), 50/50 by
 * default; expanding one panel gives it 70% without unmounting either; narrow screens use tabs.
 * Probing mode: the probing content takes the full screen and the whiteboard section becomes a
 * full-screen overlay (or stays hidden-but-mounted when closed) so the drawing ref survives for
 * the brief export — the whiteboard section keeps its DOM identity across the mode switch.
 */
export function ThreePanelLayout({
  whiteboard,
  probing,
  mode = "split",
  whiteboardOpen = false,
  onCloseWhiteboard,
  onOpenWhiteboard,
}: {
  whiteboard: ReactNode;
  probing: ReactNode;
  mode?: "split" | "probing";
  whiteboardOpen?: boolean;
  onCloseWhiteboard?: () => void;
  onOpenWhiteboard?: () => void;
}) {
  const [expanded, setExpanded] = useState<PanelKey | "none">("none");
  const narrow = useIsNarrow(900);
  const [activeTab, setActiveTab] = useState<PanelKey>("probing");

  function toggle(panel: PanelKey) {
    setExpanded((current) => (current === panel ? "none" : panel));
  }

  const content: Record<PanelKey, ReactNode> = { whiteboard, probing };

  const gridTemplateColumns = PANEL_ORDER.map((panel) => {
    if (expanded === "none") return `${BASE_FR[panel]}fr`;
    return `${panel === expanded ? EXPANDED_FR : SHRUNK_FR}fr`;
  }).join(" ");

  const probingMode = mode === "probing";
  return (
    <div className="flex h-full flex-col bg-ground">
      {/* The tab-bar slot exists in both modes (null in probing) so the panels grid keeps its
          child index — and the mounted whiteboard inside it — across the split -> probing switch. */}
      {probingMode ? null : narrow && (
        <div className="flex border-b border-line bg-card" aria-label="Workspace panels">
          {PANEL_ORDER.map(panel => <button key={panel} type="button" aria-pressed={activeTab === panel}
            onClick={() => setActiveTab(panel)} className={`flex-1 px-3 py-3 text-sm ${activeTab === panel ? 'border-b-2 border-brand text-brand-deep' : 'text-muted'}`}>{PANEL_TITLES[panel]}</button>)}
        </div>
      )}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: probingMode || narrow ? '1fr' : gridTemplateColumns }}>
        {probingMode ? (
          <>
            {/* Slide-in drawer, always mounted: React keeps WhiteboardPanel's instance — and the
                drawn scene — across the mode switch, and unlike display:none the translated
                drawer keeps real canvas dimensions. It slides via transform only; the closed
                drawer is moved off-screen, marked aria-hidden and inert so nothing can reach it.
                exportPng builds the PNG offscreen from scene elements either way. */}
            <section
              key="whiteboard"
              aria-hidden={!whiteboardOpen}
              inert={!whiteboardOpen}
              className={`fixed bottom-0 top-0 z-50 flex w-[min(32rem,calc(100vw-3.5rem))] min-w-0 flex-col overflow-hidden border-r border-line bg-ground transition-transform duration-200 ease-out left-0 md:left-14 ${
                // Translate by the drawer's width PLUS the 3.5rem anchor offset: the md+ left
                // anchor alone would leave a 56px strip on-screen after a plain -100% slide.
                // Underscores are Tailwind's spaces — calc( needs them around the +.
                whiteboardOpen ? "translate-x-0" : "-translate-x-[calc(100%_+_3.5rem)]"
              }`}
            >
              {/* The header stays mounted so the section's child structure is constant — no
                  child-index shift can ever remount the board. */}
              <div className="flex items-center justify-between border-b border-line bg-card px-3 py-2">
                <h2 className="text-sm font-bold text-ink">Whiteboard</h2>
                <button
                  type="button"
                  onClick={onCloseWhiteboard}
                  aria-label="Close whiteboard"
                  className="rounded p-1 text-muted hover:bg-fill"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-3">{whiteboard}</div>
            </section>

            {/* Left-edge handle for the drawer; rendered only while closed so it never
                competes with the drawer's own close control. */}
            {!whiteboardOpen && (
              <button
                key="whiteboard-handle"
                type="button"
                onClick={onOpenWhiteboard}
                aria-label="Open whiteboard"
                title="Open whiteboard"
                className="fixed top-1/2 z-40 flex size-9 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-connector bg-card text-muted hover:bg-fill hover:text-ink left-0 md:left-14"
              >
                <PencilLine size={15} />
              </button>
            )}

            {/* Full-width probing content; the drawer overlays its left edge while open. */}
            <section
              key="probing"
              className="flex min-w-0 min-h-0 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-hidden p-3">{probing}</div>
            </section>
          </>
        ) : (
          PANEL_ORDER.map(panel => <section key={panel} aria-label={PANEL_TITLES[panel]} hidden={narrow && activeTab !== panel}
            className={`${narrow && activeTab !== panel ? 'hidden' : 'flex'} min-w-0 min-h-0 flex-col overflow-hidden border-r border-line`}>
            {!narrow && <PanelHeader panel={panel} expanded={expanded === panel} onToggle={() => toggle(panel)} />}
            <div className="min-h-0 flex-1 overflow-hidden p-3">{content[panel]}</div>
          </section>)
        )}
      </div>
    </div>
  );
}
