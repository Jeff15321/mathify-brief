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
| `ANTHROPIC_MODEL` | Model id for generation and independent review calls (default `claude-sonnet-5-5`). |
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
npm run test:e2e   # production build + isolated Playwright journeys (mocked AI)
```

Automated tests never call the paid Anthropic API, regardless of `.env.local`.

## Demo walkthrough

1. `npm run dev`, open http://localhost:3000. The entry route opens `/workspace`.
2. Type a question (e.g. `Solve $2(x + 3) = 14$.`) and/or add its PNG/JPEG/WebP/PDF sources
   in one batch. Read the purpose and select **Let’s begin** once.
3. Draw in the same workspace while questions are prepared. Answer one check at a time with
   **Next**, or open its optional hint. A wrong or "I don't know" answer shows one simpler
   check on the same concept. On phones, switch between drawing and checks without losing either.
4. Finish at any point. The current selected answer is included even without pressing Next.
   Unreached concepts and shown-but-unanswered questions stay distinct. If drawing export fails,
   retry or explicitly send without the drawing; the report records the omission.
5. `/brief` shows the original problem, a suggested teaching start, a supporting response and
   evidence limits. Open disclosures for detailed results and use the existing tutor feedback form.
6. **Start a new question** opens a fresh draft. The current server report remains until Begin
   successfully replaces the singleton workspace.

With `AI_MOCK_MODE=true` (default) this entire flow runs fully offline against a deterministic
fixture provider. Set `AI_MOCK_MODE=false` with a real `ANTHROPIC_API_KEY` to use live Claude
calls. Every analysis and every deferred question pair now requires a separate review call
using the same configured model in a fresh conversation. For a 3–5 step session, successful
generation and review use 6–10 logical AI calls total (two per step); transport retries can
add requests. Review adds latency and token cost, including re-reading attachments for the
initial analysis. The Tutor Brief makes no AI call.

Review checks answer keys, unique correct options, explanations, prerequisite relevance,
same-concept easier retries, and the breakdown's mathematical and pedagogical accuracy.
Every check must pass before content is saved as ready. This is a quality gate, not a proof
of correctness; the same model may still make correlated mistakes. Mock mode remains fully
offline and approves only its fixed demo fixtures; it is not a mathematical reviewer for
arbitrary input. Verdicts and answer keys are never included in student workspace responses.

A rejected, malformed, or unavailable review returns a generic recoverable error. There is no
automatic content regeneration loop: retry analysis from intake, or use the existing probe
retry control for a failed deferred pair. Each retry generates and reviews fresh content.
Use a fresh `LOCAL_DATA_DIR` for the pilot. Older saved schemas return `UPGRADE_REQUIRED`;
existing workspace and upload files are preserved. Historical report migration is not included.

## Verification status (2026-11-09 pilot candidate)

- Typecheck, lint and the production build pass. **151 unit/component tests** cover storage,
  scoring, quality review, feedback, drafts, schema handling and concurrency, including late AI
  responses after replacement/completion and atomic selected-answer Finish.
- **16 Chromium journeys** cover the integrated adaptive flow, drawing/selection refresh,
  two-photo and PDF intake, six report states, mobile tabs, hints, explicit file rejection,
  network recovery, unavailable draft storage, export omission and opt-in event boundaries.
  Playwright builds and starts its own mock server with unique temporary data on port 3100.
- Desktop and phone screenshots were inspected. Mock evaluation produced 48 records / 144
  pairs across both prompt variants, with zero API calls. This verifies evaluation plumbing.
- The current prompt has **not** been rated by tutors or evaluated against a live model.
  Student task success, speed improvement and tutor comprehension after 15 seconds remain
  unmeasured. Physical camera/gallery, other browser engines and full keyboard/screen-reader
  acceptance also remain pending. See the [pilot protocol](plan/mathify-pilot-protocol.md).

## Known future work (intentionally not implemented)

Sessions/history, Supabase persistence, Vercel direct-upload migration, student/tutor auth, AI
regeneration, and the other items documented in `MVP_DESCRIPTION.md` Section 1. None of this MVP's
code assumes they exist; adding them is a deliberate, separate migration.

## Status

The original MVP has been extended by six stacked draft PRs. Engineering checks are complete
for the tested scope; participant evaluation is pending. No deployment or merge is implied.

## Next-version pilot stack

See [the pilot protocol](plan/mathify-pilot-protocol.md) for branch order and measurement definitions.
The pilot uses workspace schema 5 and brief schema 6. Run it with a fresh, isolated
`LOCAL_DATA_DIR` (for example `/tmp/mathify-pilot-v2`); keep existing demo data unchanged.
Unsupported saved schemas return `UPGRADE_REQUIRED` instead of silently discarding a report.
Historical report migration is not included. The existing AI quality-review gate and
tutor feedback are retained. No human study or live-model efficacy result is implied by tests.


The student route is now `/workspace`: add all sources, then select **Let’s begin** once.
Original sources are fixed after Begin; start a new question to correct them. Inserted board
images are working material and do not regenerate checks. PDFs open separately. Drafts
(files, scene binaries and the current selection) are saved in IndexedDB on this device,
expire after 24 hours of inactivity on the next visit, and are cleared after a successful handoff.
Watch the save status before refreshing. Storage failure is shown explicitly.

Excalidraw 0.18.1 is loaded only in the browser with locally copied fonts. Its older Radix
transitive packages emit React peer-range warnings; production-build Chromium journeys
exercise the editor with React 19.3.0. Scoped Nano ID and lodash-es overrides address the
new high-severity dependency findings. Production audit still reports low-severity KaTeX
transitive findings (including existing markdown dependencies); no zero-vulnerability claim
is made. Do not run a blanket `npm audit fix --force`.
