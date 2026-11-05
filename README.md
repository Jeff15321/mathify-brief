# Mathify Tutor Brief MVP

Local, single-user demo of diagnostic tutoring intake: a student submits one math question,
Claude generates a student-safe breakdown and a plan of prerequisite multiple-choice probes, the
student answers them one at a time in a three-panel workspace (whiteboard / relevant concepts /
breakdown), getting one easier retry on a concept after a wrong or "I don't know" answer, and a
Tutor Brief dashboard is computed from the stored answers (no AI) plus an optional whiteboard snapshot.

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
4. **This branch is an incomplete report-design experiment, not intended for merge.**
   `/brief` leads with observed-result categories and concise concept names, alphabetized
   within each category. One striped concept row can open at a time, revealing the original
   question and student answer for each attempt. Correct, unsure, unanswered and unreached
   responses remain distinct. Original problem/work and report metadata stay in secondary
   disclosures. The original dashboard remains the intended UI pending further review.
5. **Start a new question** returns to `/` and replaces the current workspace.

With `AI_MOCK_MODE=true` (default) this entire flow runs fully offline against a deterministic
fixture provider. Set `AI_MOCK_MODE=false` with a real `ANTHROPIC_API_KEY` to use live Claude
calls. A session makes 1 analysis call (which also writes the first question pair), one
text-only call per remaining planned step (main + easier question). The Tutor Brief makes no
AI call.

Upgrading from an earlier build: a `data/workspace.json` with an older `schemaVersion` is
ignored (treated as no workspace), and its old upload files are left in `data/uploads/`. Delete
`data/` to clean up.

## Verification of this draft experiment

- `npm test`: **83 tests passed**, including deterministic scoring, service/storage behavior,
  grouped result categories, alphabetical display labels, original pair identities, and disclosure content.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- Four Playwright journeys passed against an isolated mock-AI production server on port 3202
  with temporary storage: normal probe/whiteboard flow; keyboard and pointer exclusive row
  disclosure; unanswered/unreached mobile states; image-only and long original problems; and
  long answer wrapping. Desktop/mobile screenshots were inspected. These checks do not establish
  tutor usability or approve the unfinished design for merge.
- Automated checks make no paid AI calls. Vitest reports its existing Vite config-loader warning.

## Known future work (intentionally not implemented)

Sessions/history, Supabase persistence, Vercel direct-upload migration, student/tutor auth, AI
regeneration, and the other items documented in `MVP_DESCRIPTION.md` Section 1. None of this MVP's
code assumes they exist; adding them is a deliberate, separate migration.

## Status

**Stages 0-4 complete.** The full MVP described in `IMPLEMENTATION_PLAN.md` is implemented and
verified: platform smoke test, intake/storage, Claude analysis, the three-panel workspace, and the
Tutor Brief.
