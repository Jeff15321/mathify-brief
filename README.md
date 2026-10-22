# Mathify Tutor Brief MVP

Local, single-user demo of diagnostic tutoring intake: a student submits one math question,
Claude generates a student-safe breakdown and a plan of prerequisite multiple-choice probes, the
student answers them one at a time in a three-panel workspace (whiteboard / relevant concepts /
breakdown), getting one easier retry on a concept after a wrong or "I don't know" answer, and a
Tutor Brief report is produced from the deterministic results plus an optional whiteboard snapshot.

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
| `ANTHROPIC_MODEL` | Model id for both Mathify AI calls (default `claude-sonnet-5-5`). |
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

## Demo walkthrough

1. `npm run dev`, open http://localhost:3000.
2. Type a question (e.g. `Solve $2(x + 3) = 14$.`) and/or attach PNG/JPEG/WebP/PDF files, click
   **Begin Session**.
3. On `/workspace`: draw on the left whiteboard and answer the middle **Relevant Concepts**
   questions one at a time with **Next**. A wrong or "I don't know" answer shows one easier
   question on the same concept before moving on; answers lock once you move on. The next
   question is generated in the background while you answer the current one. Expand/restore any
   panel, and click **Submit** at any point (questions not reached count as unanswered).
4. `/brief` shows the Tutor Brief: answered/correct/don't-know/unanswered counts and easier
   retries, per-question results (retries grouped under their main question) with explanations, observed strengths/possible gaps with evidence, whiteboard observations (only if
   you drew something), grade assessment, and a suggested starting point.
5. **Start a new question** returns to `/` and replaces the current workspace.

With `AI_MOCK_MODE=true` (default) this entire flow runs fully offline against a deterministic
fixture provider. Set `AI_MOCK_MODE=false` with a real `ANTHROPIC_API_KEY` to use live Claude
calls. A session makes 1 analysis call (which also writes the first question pair), one
text-only call per remaining planned step (main + easier question), and 1 brief call.

Upgrading from an earlier build: a `data/workspace.json` with an older `schemaVersion` is
ignored (treated as no workspace), and its old upload files are left in `data/uploads/`. Delete
`data/` to clean up.

## Verification status (all four stages)

- `npm run typecheck`, `npm run lint`, `npm run build` - all pass with no errors or warnings.
- `npm run test` - **71/71 Vitest tests passing**: isolated temp-dir storage (including serialized
  concurrent updates and old-schema handling), every upload-validation rejection path, mocked
  analysis (plan + first pair, no leaked keys or buffered probes), the pure probe flow (easier
  retry on wrong/IDK, one retry per step, one-step-ahead buffer, stale/failed generation
  recovery), probe generation/answering services (idempotent prefetch, locked answers, no lost
  writes during generation, failure retry), deterministic scoring (served probes, retries,
  unreached steps, early submit), brief submission, and component tests (one-question panel,
  Next gating, easier badge, waiting/retry states, radio persistence, Original/Parsed, panel
  expand/restore keeps children mounted).
- `npm run test:e2e` - **1/1 Playwright test passing** on its own mock-AI production server
  (port 3100): intake -> wrong answer -> easier retry -> buffered next question -> "I don't
  know" -> retry -> draw -> expand/restore -> early Submit -> brief counts and grouped retries.
- Manually verified twice in a real Chrome browser (via the claude-in-chrome tooling): the full
  intake -> workspace -> brief flow, including whiteboard ink surviving panel expand/restore and
  the exported whiteboard PNG rendering correctly on the Tutor Brief page.
- Live Anthropic connectivity: confirmed working with a real key for both the text-only Stage 0
  smoke call and one full typed-question Stage 2 analysis call (~17s, produced a valid student-safe
  breakdown + 4 MCQs). Automated tests never call the paid API regardless of `.env.local`.

## Known future work (intentionally not implemented)

Sessions/history, Supabase persistence, Vercel direct-upload migration, student/tutor auth, AI
regeneration, and the other items documented in `MVP_DESCRIPTION.md` Section 1. None of this MVP's
code assumes they exist; adding them is a deliberate, separate migration.

## Status

**Stages 0-4 complete.** The full MVP described in `IMPLEMENTATION_PLAN.md` is implemented and
verified: platform smoke test, intake/storage, Claude analysis, the three-panel workspace, and the
Tutor Brief.
