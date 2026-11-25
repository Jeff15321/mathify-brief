"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

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
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
      <h2 className="min-w-0 truncate text-sm font-semibold text-slate-900">{PANEL_TITLES[panel]}</h2>
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? `Restore ${PANEL_TITLES[panel]}` : `Expand ${PANEL_TITLES[panel]}`}
        className="rounded p-1 text-slate-500 hover:bg-slate-100"
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
}: {
  whiteboard: ReactNode;
  probing: ReactNode;
  mode?: "split" | "probing";
  whiteboardOpen?: boolean;
  onCloseWhiteboard?: () => void;
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
    return `${panel === expanded ? EXPANDED_FR : SHRUNK_FR}fr}`;
  }).join(" ");

  const probingMode = mode === "probing";
  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* The tab-bar slot exists in both modes (null in probing) so the panels grid keeps its
          child index — and the mounted whiteboard inside it — across the split -> probing switch. */}
      {probingMode ? null : narrow && (
        <div className="flex border-b border-slate-200 bg-white" aria-label="Workspace panels">
          {PANEL_ORDER.map(panel => <button key={panel} type="button" aria-pressed={activeTab === panel}
            onClick={() => setActiveTab(panel)} className={`flex-1 px-3 py-3 text-sm ${activeTab === panel ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-600'}`}>{PANEL_TITLES[panel]}</button>)}
        </div>
      )}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: probingMode || narrow ? '1fr' : gridTemplateColumns }}>
        {probingMode ? (
          <>
            {/* Same section keys as split mode: React reconciles by key, so WhiteboardPanel
                keeps its instance — and the drawn scene — across the mode switch. The hidden
                CLASS (not just the attribute, which Tailwind's flex utility would override)
                keeps it mounted and the board ref alive while the overlay is closed; exportPng
                builds the PNG offscreen from scene elements either way. A display:none section
                generates no grid row, so probing content gets the full width. */}
            <section
              key="whiteboard"
              hidden={!whiteboardOpen}
              className={
                whiteboardOpen
                  ? "fixed inset-0 z-50 flex min-w-0 min-h-0 flex-col overflow-hidden bg-slate-50 shadow-xl"
                  : "hidden min-w-0 min-h-0 flex-col overflow-hidden"
              }
            >
              {/* The header stays mounted (hidden with the section when closed) so the section's
                  child structure is constant — no child-index shift can ever remount the board. */}
              <div
                hidden={!whiteboardOpen}
                className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2"
              >
                <h2 className="text-sm font-semibold text-slate-900">Whiteboard</h2>
                <button
                  type="button"
                  onClick={onCloseWhiteboard}
                  aria-label="Close whiteboard"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-3">{whiteboard}</div>
            </section>

            {/* Full-width probing content; inert while the whiteboard overlay is open so focus
                and screen readers can't reach it, without triggering re-visibility events. */}
            <section
              key="probing"
              inert={whiteboardOpen}
              className="flex min-w-0 min-h-0 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-hidden p-3">{probing}</div>
            </section>
          </>
        ) : (
          PANEL_ORDER.map(panel => <section key={panel} hidden={narrow && activeTab !== panel}
            className={`${narrow && activeTab !== panel ? 'hidden' : 'flex'} min-w-0 min-h-0 flex-col overflow-hidden border-r border-slate-200`}>
            {!narrow && <PanelHeader panel={panel} expanded={expanded === panel} onToggle={() => toggle(panel)} />}
            <div className="min-h-0 flex-1 overflow-hidden p-3">{content[panel]}</div>
          </section>)
        )}
      </div>
    </div>
  );
}
