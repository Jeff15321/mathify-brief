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
| `ANTHROPIC_SUMMARY_MODEL` | Cheaper model id used only for session summaries (default `claude-haiku-5-5`). |
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

## Session tracker

Work in progress: tutors will upload past tutoring sessions and see patterns across them.

- **Storage:** `LocalSessionStore` (`sessionStore` from `createStores`) saves each session to
  `LOCAL_DATA_DIR/sessions/<id>.json`, with whiteboard images in `sessions/<id>/`. It is
  separate from `workspace.json` and the asset store, so starting a new question never deletes
  sessions. Writes are atomic, and updates are serialized per session.
- **Transcript format:** plain text with optional header lines and `[HH:MM:SS] Speaker: text`
  turns. Unlabelled text is also accepted. See [`docs/TRANSCRIPT_FORMAT.md`](docs/TRANSCRIPT_FORMAT.md).
- **Samples:** four Grade 9 algebra sessions and three whiteboard images that tell one story,
  in [`samples/sessions/`](samples/sessions/README.md).
- **Summaries:** `summarizeStoredSession` (`src/server/session-summary-service.ts`) sends one
  session (transcript, tutor notes, whiteboards) to `ANTHROPIC_SUMMARY_MODEL` and stores a title,
  a 2-4 sentence summary and up to 8 observations (struggle, strength, what works, habit). The
  session is `pending` while it runs, then `ready` or `failed`; a claim older than 2 minutes can
  be retried. Transcripts over 120,000 characters are truncated. Mock mode returns a fixed summary.
- **API** (`src/server/session-service.ts`, client functions in `src/lib/api-client.ts`):

  | Method | Path | Behaviour |
  | --- | --- | --- |
  | POST | `/api/sessions` | multipart `transcript` (one `.txt/.md/.vtt/.srt` UTF-8 file, ≤ 1 MiB), `whiteboards` (0-5 PNG/JPEG/WebP), `sessionDate` (`YYYY-MM-DD`, default today, not in the future), `tutorNotes` (≤ 2000 chars). Saves as `pending`, then summarizes; `201 { session }` even if the summary failed |
  | GET | `/api/sessions` | `{ sessions }` without transcripts |
  | GET | `/api/sessions/[id]` | `{ session }` with transcript |
  | PATCH | `/api/sessions/[id]` | JSON `{ sessionDate?, tutorNotes? }` |
  | DELETE | `/api/sessions/[id]` | 204, removes the JSON and whiteboards |
  | POST | `/api/sessions/[id]/summarize` | retries a failed summary; 409 if already `ready` |
  | GET | `/api/sessions/[id]/assets/[assetId]` | whiteboard image; 404 if not in that session |

- **Navigation:** `AppNav` (`src/components/shared/AppNav.tsx`, rendered from the root layout)
  links Workspace, Tutor Brief, Sessions and Learner profile. On
  desktop it is a left sidebar that collapses to an icon rail; it starts collapsed on `/workspace`
  and remembers the last toggle in `localStorage`. Narrow screens get a top bar with a menu.
- **`/sessions`:** upload a transcript with up to 5 whiteboard images, a session date and optional
  tutor notes, then see every session newest first with its AI title, summary, counts and status.
  The list refreshes every 3 s while a summary is pending, and failed summaries have a Retry
  button. Cards link to `/sessions/[id]`.
- **`/sessions/[id]`:** the AI title with session date, upload date and status badges, then the
  summary (a loader while pending, refreshed every 3 s; Retry when failed), observations grouped
  into Struggles, Strengths, What works and Habits, whiteboard thumbnails that open full size in a
  new tab, editable tutor notes and session date, and the transcript, collapsed to a 15-line
  preview with speaker labels in bold. Delete session asks for confirmation, then returns to
  `/sessions`. Unknown ids show "Session not found".
- **Learner profile** (`src/server/learner-profile-service.ts`): one profile for the demo student
  in `LOCAL_DATA_DIR/learner-profile.json` (`profileStore`; empty until the first rebuild, atomic,
  serialized writes). `rebuildProfile` sends every `ready` session's observations, plus the tutor's
  items and notes as read-only context, to `ANTHROPIC_SUMMARY_MODEL` (`profile-v2`), which returns
  `nextFocus` and up to 20 merged items (struggle, strength, what works, habit) with a status
  (`active`, `improving`, `resolved`) and evidence per session. It runs after a summary becomes
  `ready`, after a session edit and after a delete; rebuilds are serialized, and a failed rebuild
  is only logged there. Merge rules: tutor items are kept, AI items are replaced, evidence for
  deleted sessions is dropped (dates follow session date edits), and AI items left without
  evidence are dropped. A failure keeps the previous profile with `rebuildStatus: 'failed'`. A
  tutor-written `nextFocus` (`nextFocusSource: 'tutor'`) survives rebuilds; PATCHing it to `""`
  hands it back to the AI. An edited AI item keeps its AI wording as `originText`, and rebuilt AI
  items whose normalized text matches a tutor item's `text` or `originText` in the same category
  are dropped. Deleting an AI item adds its category and text to `dismissed` (latest 100 kept;
  deleting a tutor item does not); dismissed items are sent to the model as removed by the tutor,
  and rebuilt AI items matching one are dropped the same way. Mock mode groups identical observation texts.

  | Method | Path | Behaviour |
  | --- | --- | --- |
  | GET | `/api/profile` | `{ profile }` |
  | PATCH | `/api/profile` | JSON `{ nextFocus? (≤ 300), tutorNotes? (≤ 2000), upsertItems? (≤ 20, text ≤ 300), deleteItemIds? }`; upserted items, including edited AI items, become `source: 'tutor'` and keep their evidence; deleted AI items are dismissed |
  | POST | `/api/profile/rebuild` | rebuilds now; 502 on failure (previous profile kept) |

- **`/profile`** (`src/components/profile/`): a student card (initials, name, grade, session count,
  last session date, when the profile was updated and rebuilt) with **Rebuild from sessions**,
  which spins while rebuilding and turns into **Retry rebuild** after a failure. Below it the next
  session focus, marked as suggested by AI or written by the tutor; editing it makes it the tutor's,
  and **Let AI suggest** clears it and rebuilds. Then Struggles, Strengths, What works when teaching
  and Habits (two columns on wide screens): each item has a status pill (active amber, improving
  blue, resolved emerald), a Tutor chip for tutor items, and evidence date chips that open the
  session (the quote is the tooltip). Items can be edited (text and status), deleted after a
  confirmation, or added per section as tutor items. Tutor notes save on blur or with Save and are
  never changed by the AI. Every change shows the server's response. The page refreshes every 3 s
  while a rebuild or a session summary is running. With no sessions it links to `/sessions`.

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
