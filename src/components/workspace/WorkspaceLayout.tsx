"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

type Panel = "whiteboard" | "questions";

export function WorkspaceLayout({ whiteboard, questions, questionTitle }: {
  whiteboard: ReactNode;
  questions: ReactNode;
  questionTitle: string;
}) {
  const [narrow, setNarrow] = useState(false);
  const [active, setActive] = useState<Panel>("questions");
  const [expanded, setExpanded] = useState<Panel | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const panels = [
    { id: "whiteboard", title: "Whiteboard", content: whiteboard },
    { id: "questions", title: questionTitle, content: questions },
  ] as const;
  const columns = { whiteboard: "7fr 3fr", questions: "3fr 7fr", equal: "1fr 1fr" };

  return (
    <div className="flex h-full flex-col bg-ground">
      {narrow && (
        <div role="group" aria-label="Workspace panels" className="flex border-b border-line bg-card">
          {panels.map(({ id, title }) => (
            <button key={id} type="button" aria-pressed={active === id} aria-controls={`panel-${id}`}
              onClick={() => setActive(id)}
              className={`flex-1 border-b-2 px-3 py-3 text-sm ${active === id ? "border-brand font-bold text-brand-deep" : "border-transparent text-muted"}`}>
              {title}
            </button>
          ))}
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)]"
        style={{ gridTemplateColumns: narrow ? "1fr" : columns[expanded ?? "equal"] }}>
        {panels.map(({ id, title, content }) => {
          const hidden = narrow && active !== id;
          const isExpanded = expanded === id;
          // The inactive board keeps its canvas dimensions for image import and export.
          const display = hidden && id === "questions" ? "hidden" : "flex";
          return (
            <section key={id} id={`panel-${id}`} aria-label={title} inert={hidden}
              className={`${display} min-h-0 min-w-0 flex-col overflow-hidden ${narrow ? "col-start-1 row-start-1" : "first:border-r first:border-line"} ${hidden ? "invisible opacity-0" : ""}`}>
              {!narrow && (
                <header className="flex items-center justify-between border-b border-line bg-card px-3 py-2">
                  <h2 className="min-w-0 truncate text-sm font-bold text-ink">{title}</h2>
                  <button type="button" aria-label={`${isExpanded ? "Restore" : "Expand"} ${title}`}
                    onClick={() => setExpanded(isExpanded ? null : id)}
                    className="rounded p-1 text-muted hover:bg-fill">
                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </header>
              )}
              <div className="min-h-0 flex-1 overflow-hidden p-3">{content}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
