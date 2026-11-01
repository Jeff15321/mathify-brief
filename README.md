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
The current jsdom/undici test dependencies require a compatible Node runtime
(Node 22.22.2+ on the 22.x line, or Node 24.15.0+ on the 24.x line).

## Demo walkthrough

### Stakeholder evidence presentation

Download `/Mathify-stakeholder-evidence.pptx` for the editable PowerPoint version:
12 slides, including sources and template credits. It adapts the
[Beatrice Google Slides/PowerPoint template](https://www.slidescarnival.com/template/beatrice-free-presentation-template/66)
by SlidesCarnival under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Template attribution is retained, but the visible layouts are original:
16:9 product-review compositions with message headlines, native diagrams,
large synthetic prototype screenshots, evidence boundaries, and a validation ask.
The design references an actual
[public Google Cloud executive deck](https://services.google.com/fh/files/misc/goldman_sachs_keynote_google_cloud_thomas_kurian_021120.pdf)
and [Sparks' Google Cloud Next design case study](https://www.wearesparks.com/our-work/google-cloud-next/).
It does not reproduce Google slides, logos, or imply endorsement.
Typography uses Segoe UI with an Arial fallback in the browser.
Native PowerPoint text and diagrams remain editable; natural spoken scripts
are included in speaker notes.
The deck contains no em dashes and explicitly states that no tutor responses
have been received. The questionnaire was distributed; response analysis is pending.

Open `/stakeholder-deck.html` or open `public/stakeholder-deck.html` directly in a
browser. It is a static 12-slide presentation with no AI calls or remote assets.
The browser uses the same authored 16:9 composition as PowerPoint, rather than
reflowing it into a long article. Speaker scripts appear below the slide.
Keep `public/deck-images` alongside the HTML when copying it.
Use arrow keys, Home/End, **N** for speaker notes, and **P** or
**Print / Save PDF** for a printable deck. Sources and caveats are included.

To rebuild both versions, run `python scripts/build-stakeholder-deck.py` on Windows
with `python-pptx==1.0.2` and Pillow installed. The builder reuses the committed
template-derived PowerPoint and three local mock UI screenshots.
Edit the shared slide data and canvas compositions in that script, not the
generated HTML. Each canvas is rendered as native editable PowerPoint objects
and accessible SVG in the browser.

The deck distinguishes published design rationale, synthetic prototype tests,
checked reference answers, and unmeasured effectiveness. There are currently zero
tutor responses. No live-model accuracy run was possible without an API credential.
See `docs/prompt-research.md` for the corrected research claims and review protocol.

### Reading-week whiteboard update

The workspace embeds Excalidraw (loaded client-side) for freehand drawing, text,
shapes, arrows, erasing, and image insertion. Uploaded PNG/JPEG/WebP questions are
added as separate editable images; PDFs remain available in the original-question
view. Expand/restore and narrow-screen tab changes keep the scene mounted.
Submission locks editing and exports the whole non-deleted scene to a white-background
PNG (including uploaded images). An empty scene sends no whiteboard. Load/export
errors are shown rather than silently dropping work. The scene remains in browser
memory until submission; refresh recovery and cross-session history remain deferred.

`npm install` copies Excalidraw's bundled fonts into a git-ignored public assets
directory so text rendering/export does not rely on a font CDN. If that directory
is removed, run `npm run postinstall` to restore it.

Private planning sources and stage notes live in `.project-notes/`, excluded by
`.gitignore`. This branch builds on Alec's `feedback-features`; session management
remains deferred under the latest explicit team instruction.

The whiteboard includes **Fit to work**, a waiting-time prompt, and visible image
loading status. Automatic fitting happens only when new question images are
imported, so ordinary rerenders do not reset the student's pan/zoom.

Tutor feedback requires three 1-5 ratings; comments are optional and capped at
5,000 characters. Failed HTTP/network submissions show an error and preserve the
form for retry rather than displaying a false success. Report confidence is
explicitly labeled a heuristic, not a validated accuracy probability. In-app
feedback is separate from the external tutor needs/layout questionnaire and does
not measure the 10-15-second skim target.

Whiteboard update verification: production build, typecheck, touched-file lint,
41 focused unit/component tests, and two mock-AI browser flows pass. The browser
coverage includes drawing across expansion/mobile tabs, text entry, blank-board
submission, multi-image PNG export, successful feedback API submission, and no
external network requests. Feedback regression tests also cover rejected HTTP
requests, network failures, and preserving inputs for retry.

1. `npm run dev`, open http://localhost:3000.
2. Type a question (e.g. `Solve $2(x + 3) = 14$.`) and/or attach PNG/JPEG/WebP/PDF files, click
   **Begin Session**.
3. On `/workspace`: draw on the left whiteboard and answer the middle **Relevant Concepts**
   questions one at a time with **Next**. A wrong or "I don't know" answer shows one easier
   question on the same concept before moving on; answers lock once you move on. The next
   question is generated in the background while you answer the current one. Expand/restore any
   panel, and click **Submit** at any point (questions not reached count as unanswered).
4. `/brief` shows the Tutor Brief dashboard, built to be skimmed in seconds: Core probes and
   Easier retries tallies, strengths and possible gaps (concept names), the priority / key
   incorrect step (what the student picked vs the correct answer, and how the retry went), a
   whiteboard preview, and a collapsed Probing results list with every question and answer.
5. **Start a new question** returns to `/` and replaces the current workspace.

With `AI_MOCK_MODE=true` (default) this entire flow runs fully offline against a deterministic
fixture provider. Set `AI_MOCK_MODE=false` with a real `ANTHROPIC_API_KEY` to use live Claude
calls. A session makes 1 analysis call (which also writes the first question pair), one
text-only call per remaining planned step (main + easier question). The Tutor Brief makes no
AI call.

Upgrading from an earlier build: a `data/workspace.json` with an older `schemaVersion` is
ignored (treated as no workspace), and its old upload files are left in `data/uploads/`. Delete
`data/` to clean up.

## Verification status (all four stages)

- `npm run typecheck`, `npm run lint`, `npm run build` - all pass with no errors or warnings.
- `npm run test` - **80/80 Vitest tests passing**: isolated temp-dir storage (including serialized
  concurrent updates and old-schema handling), every upload-validation rejection path, mocked
  analysis (plan + first pair, no leaked keys or buffered probes), the pure probe flow (easier
  retry on wrong/IDK, one retry per step, one-step-ahead buffer, stale/failed generation
  recovery), probe generation/answering services (idempotent prefetch, locked answers, no lost
  writes during generation, failure retry), deterministic scoring (served probes, retries,
  unreached steps, early submit), the brief summary (tallies, strengths/gaps, priority step),
  brief submission (no AI call), and component tests (one-question panel, Next gating, easier
  badge, waiting/retry states, radio persistence, Original/Parsed, panel expand/restore keeps
  children mounted, brief tally/priority cards, collapsed probing results).
- `npm run test:e2e` - **1/1 Playwright test passing** on its own mock-AI production server
  (port 3100): intake -> wrong answer -> easier retry -> buffered next question -> "I don't
  know" -> retry -> draw -> expand/restore -> early Submit -> dashboard tallies, strengths,
  priority step, whiteboard preview and expandable probing results.
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
