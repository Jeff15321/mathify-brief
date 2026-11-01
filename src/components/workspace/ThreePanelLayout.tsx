"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

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
 * Workspace layout: Whiteboard (left) and Relevant Concepts (right), 50/50 by default. Expanding
 * one panel gives it 70% without unmounting either; narrow screens switch to tabs.
 */
export function ThreePanelLayout({
  whiteboard,
  probing,
}: {
  whiteboard: ReactNode;
  probing: ReactNode;
}) {
  const [expanded, setExpanded] = useState<PanelKey | "none">("none");
  const narrow = useIsNarrow(900);
  const [activeTab, setActiveTab] = useState<PanelKey>("whiteboard");

  function toggle(panel: PanelKey) {
    setExpanded((current) => (current === panel ? "none" : panel));
  }

  const content: Record<PanelKey, ReactNode> = { whiteboard, probing };

  const gridTemplateColumns = PANEL_ORDER.map((panel) => {
    if (expanded === "none") return `${BASE_FR[panel]}fr`;
    return `${panel === expanded ? EXPANDED_FR : SHRUNK_FR}fr`;
  }).join(" ");

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {narrow && (
        <div className="flex border-b border-slate-200 bg-white">
          {PANEL_ORDER.map((panel) => (
            <button
              key={panel}
              type="button"
              onClick={() => setActiveTab(panel)}
              aria-pressed={activeTab === panel}
              className={`flex-1 px-3 py-2 text-xs font-medium ${
                activeTab === panel ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
              }`}
            >
              {PANEL_TITLES[panel]}
            </button>
          ))}
        </div>
      )}
      <div
        className="grid min-h-0 flex-1 motion-reduce:transition-none"
        style={{
          gridTemplateColumns: narrow ? "1fr" : gridTemplateColumns,
          transition: "grid-template-columns 300ms ease",
        }}
      >
        {PANEL_ORDER.map((panel) => (
          <div
            key={panel}
            hidden={narrow && activeTab !== panel}
            style={{ display: narrow && activeTab !== panel ? "none" : undefined }}
            className="flex min-w-0 flex-col overflow-hidden border-r border-slate-200 last:border-r-0"
          >
            {!narrow && <PanelHeader panel={panel} expanded={expanded === panel} onToggle={() => toggle(panel)} />}
            <div className="min-h-0 flex-1 overflow-hidden p-3">{content[panel]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
