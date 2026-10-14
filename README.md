# Mathify Tutor Brief MVP

Local, single-user demo of diagnostic tutoring intake: a student submits one math question,
Claude generates a student-safe breakdown and prerequisite multiple-choice probes, the student
works in a three-panel workspace (whiteboard / probing / breakdown), and a Tutor Brief report is
produced from the deterministic results plus an optional whiteboard snapshot.

See `CLAUDE_CODE_START_HERE.md`, `IMPLEMENTATION_PLAN.md`, and `MVP_DESCRIPTION.md` for the full
specification, scope, and deferred future work (sessions, Supabase, Vercel deployment, auth).

## Setup

```bash
npm install
cp .env.example .env.local
# add ANTHROPIC_API_KEY to .env.local once you have one (optional while AI_MOCK_MODE=true)
npm run dev
```

Open http://localhost:3000.

### Environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-only Claude Console key. Never exposed to the browser. |
| `ANTHROPIC_MODEL` | Model id for both Mathify AI calls (default `claude-sonnet-5`). |
| `LOCAL_DATA_DIR` | Directory for the local workspace JSON + uploaded files (default `./data`). |
| `AI_MOCK_MODE` | `true` (default) runs fully offline with a deterministic fake provider. Set `false` to call the real Anthropic API. |
| `RUN_LIVE_AI_SMOKE` | Set to `1` (with a real key) to run one explicit, low-cost live Anthropic connectivity check. Never enabled in automated tests. |

## Commands

```bash
npm run dev         # start Next.js dev server
npm run build        # production build
npm run start         # start production server (after build)
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run test          # vitest unit/component tests (always mocked AI, isolated temp storage)
npm run test:e2e   # one Playwright happy-path end-to-end test (mocked AI)
```

Automated tests never call the paid Anthropic API, regardless of `.env.local`.

## Stage 0 checkpoint (platform smoke test)

- `npm run dev` + `npm run build` + `npm run start`: homepage returns HTTP 200, `GET /api/workspace`
  returns parseable JSON (`{ "workspace": null }`), browser fetch from the homepage succeeds — verified manually.
- Node `fs/promises` read/write/delete in an isolated OS temp directory — verified by
  `tests/stage0-fs.test.ts` (passing).
- Deterministic mock Claude provider returns schema-valid output (Zod + structural checks) —
  verified by `tests/stage0-mock-provider.test.ts` (passing).
- `npm run typecheck`, `npm run lint`, `npm run build` — all pass.
- Live Anthropic connectivity: **skipped (key/opt-in missing)** — no `ANTHROPIC_API_KEY` /
  `RUN_LIVE_AI_SMOKE=1` configured in this environment. Not a failure; set both to enable one
  real text-only smoke call via `runLiveTextSmokeTest()` in `src/server/ai/anthropic-provider.ts`.
- Caveat: this app is Vercel-deployable in principle, but local JSON/file persistence and the
  current upload path are **not** production-ready for Vercel — see `MVP_DESCRIPTION.md` Section 0.

## Status

Stage 0 complete. Stages 1-4 (intake/storage, Claude analysis, three-panel workspace, Tutor
Brief) are not yet implemented.
