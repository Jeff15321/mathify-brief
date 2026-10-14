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
3. On `/workspace`: draw on the left whiteboard, answer any of the middle probing MCQs (partial
   or zero answers are fine), expand/restore any panel, then click **Submit**.
4. `/brief` shows the Tutor Brief: answered/correct/unanswered counts, per-probe results with
   explanations, observed strengths/possible gaps with evidence, whiteboard observations (only if
   you drew something), grade assessment, and a suggested starting point.
5. **Start a new question** returns to `/` and replaces the current workspace.

With `AI_MOCK_MODE=true` (default) this entire flow runs fully offline against a deterministic
fixture provider. Set `AI_MOCK_MODE=false` with a real `ANTHROPIC_API_KEY` to use live Claude
calls for both the analysis and brief steps.

## Verification status (all four stages)

- `npm run typecheck`, `npm run lint`, `npm run build` — all pass, no errors (one pre-existing
  ESLint warning on an unused mock-provider parameter).
- `npm run test` — **37/37 Vitest tests passing**: isolated temp-dir storage round-trips, every
  upload-validation rejection path, mocked analysis (schema validity, id canonicalization, no
  leaked answer keys), 4 component tests (radio persistence, long-text rendering, Original/Parsed
  toggle, panel expand/restore keeps children mounted), deterministic scoring (correct/incorrect/
  unanswered, zero-answer, forged-probe-id rejection), and brief submission (complete/no-
  regeneration, whiteboard-only-when-nonblank).
- `npm run test:e2e` — **1/1 Playwright test passing**: the full mocked happy path (intake ->
  analysis -> workspace -> answer 2 of 3 probes -> draw -> expand/restore -> Submit -> brief),
  asserting the exact answered/correct/unanswered counts shown on `/brief`.
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
