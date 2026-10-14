"use client";

import { useEffect, useState } from "react";

/**
 * Stage 0 temporary connectivity indicator. Proves the browser frontend can reach a Next.js
 * Route Handler and parse JSON. Replaced by the real intake UI in Stage 1.
 */
export default function Home() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [body, setBody] = useState<string>("");

  useEffect(() => {
    fetch("/api/workspace", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        setBody(JSON.stringify(json));
        setStatus(res.ok ? "ok" : "error");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-8 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Mathify MVP — Stage 0 smoke test
      </h1>
      <p
        data-testid="workspace-status"
        className="font-mono text-sm text-zinc-600 dark:text-zinc-400"
      >
        GET /api/workspace: {status} {body}
      </p>
    </div>
  );
}
