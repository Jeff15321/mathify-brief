# Mathify Tutor Brief MVP — Scope, Future Roadmap, and Architecture Risks

> **READ THIS BEFORE IMPLEMENTATION.** The current product is a local, single-user *demonstration of diagnostic tutoring intake*, not a production Mathify integration. This file deliberately begins with future architecture risks so a developer doesn't accidentally make later development needlessly difficult. The actionable file tree, API contracts, types, AI prompts, components, tests, and sequence are specified in `IMPLEMENTATION_PLAN.md`.

## 0. Architectural guardrails to protect future Vercel deployment

**Stage 0 is mandatory before any product feature implementation:** boot a Next.js frontend and Node.js Route Handler, prove a browser→API request, verify temp local file access, mock the Claude model adapter and validate output, run the production build, and report an optional gated live API smoke separately. Full details are in `IMPLEMENTATION_PLAN.md` Section 12.

- **Claude model calls:** the application uses the **Anthropic Claude Messages API** with `ANTHROPIC_API_KEY` (server-only) and `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`). Claude Code used for writing code is separate; **do not run Claude Code or the Claude Agent SDK as the application's backend**. There are only two narrow model operations. Keep prompt/response contracts provider-agnostic.
- **Vercel-ready structure, not Vercel-ready data storage:** use Next.js App Router and Route Handlers with Node.js, no custom long-lived servers, and isolate file IO behind `CurrentWorkspaceStore` / `AssetStore`. Local JSON/uploads work only for local writable-disk development. Before Vercel, replace both with durable remote stores (e.g. Supabase Postgres/Storage). This is a real migration, not a toggle.
- **Uploads on Vercel:** the current local MVP permits combined attachments up to 20 MiB, but Vercel Functions have a **4.5 MB request-body size limit**. To retain 10 MiB-per-file attachments in a Vercel deployment, add signed **direct-to-Supabase Storage uploads** and pass only asset IDs/metadata through the Next.js backend. Therefore a storage-adapter swap *alone* does NOT complete Vercel migration.
- **Hosting later:** do not create Vercel infrastructure now; validate `next build` and Node runtime. Later add Vercel project/environment variables, move storage/uploads first, implement access restriction, and only then deploy.

## 1. First: what we intend to build AFTER this MVP

The future product vision is: a student waiting for a Mathify tutor submits a problem and optional work; the AI prepares diagnostic probes; a tutor receives a fast brief; after an actual tutoring session, transcript and whiteboard observations are captured, confirmed by the tutor, and aggregated into a longitudinal student learner profile. The current MVP intentionally stops **before** actual tutor collaboration.

**Roadmap in dependency order:**

| Priority | Future capability | Implementation approach when needed | Architectural impact |
| --- | --- | --- | --- |
| P1 | Persistent sessions / history | Introduce `sessions` with UUID `session_id`, `student_id`, status/timestamps; migrate singleton `CurrentWorkspace` to `Session`, all child artifacts keyed by session | **HIGH:** transforms singleton endpoints, storage schema, routing, ownership |
| P1 | Supabase persistence | Implement `SupabaseWorkspaceStore` and `SupabaseAssetStore`; use Postgres tables for records, Storage for PDFs/images/whiteboards; write DB migrations and RLS | **HIGH:** relational model and auth require changes beyond adapter swap |
| P1 | Student and tutor auth | Supabase Auth, separate roles, server authorization, least-privilege storage access; tutor gets access only to assigned sessions | **HIGH:** API security model and data ownership change |
| P2 | Tutor joins during probing / partial handoff | Add tutor-connected event and session status; snapshot available answers, generate brief without blocking connection; unanswered remain distinct | **MEDIUM:** explicit session lifecycle, async sequencing |
| P2 | AI question regeneration / correction | Introduce `analysis_runs` with `run_id`, schema/prompt/model version, source attachment/whiteboard revisions; derive a new probe set without overwriting old answers; mark previous answers tied to previous runs | **HIGH:** schema version lineage and UX policies; don't treat as a simple "retry" |
| P2 | Tutor confirmation | Add tutor review UI + `tutor_confirmations` and corrected observations, with provenance before writing any profile-derived insight | **MEDIUM:** new review and data tables |
| P3 | End-of-session transcript and whiteboard summary | Record transcript and whiteboard snapshots with timestamps; generate separate post-session summary; associate with session and tutor confirmation | **MEDIUM-HIGH:** data retention/privacy and background processing |
| P3 | Learner profile/history | Aggregate *confirmed* observations into `learner_profile_observations`; permit viewing prior relevant questions/sessions; avoid fixed learning-style diagnoses | **HIGH:** longitudinal evidence, permissions, model outputs |
| P3 | Actual Mathify integration | Adapt account data, whiteboard surface, queue events, tutor handoff, data governance and deployment to Mathify integration constraints | **HIGH:** platform-specific contracts, consent/privacy |

### Important future-proofing decisions NOW (cheap enough to keep)

1. **Server boundary:** UI calls Next.js APIs, which call AI and storage. Never embed Anthropic credentials, filesystem operations, or AI message construction in React components.
2. **Two storage interfaces:** one for current workspace data, one for opaque file assets. Keep a single construction point so later adapters can replace local filesystem code.
3. **Typed artifacts:** `QuestionAnalysisStored`, `PublicProbe`, `ProbeAnswers`, `TutorBrief` have explicit shapes; browser never receives private keys until post-submission report.
4. **Provider boundary:** one `MathAnalysisProvider` with `analyzeQuestion` and `generateTutorBrief`; don't couple Anthropic request shapes to presentation components.
5. **Artifact provenance (minimal):** each stored AI result has `model`, `promptVersion`, `generatedAt` and an initial `analysisVersion = 1`. These fields cost almost nothing and make later diagnostics/re-generation easier.
6. **Question and whiteboard are independent:** initial analysis uses typed question and uploaded files; whiteboard is only read at Submit, enabling future whiteboard-analysis policies to change in one service.
7. **Evidence separation:** student-visible roadmap does not expose a solved answer; tutor brief only claims what probe/work evidence supports.
8. **Retain an opaque asset ID:** UI uses `/api/assets/:assetId`, never local disk paths. Later the same IDs can map to Supabase objects.

### High-cost future changes that we are ACCEPTING and not implementing now

- **Singleton to multi-session migration:** the MVP's `/api/workspace` and `data/workspace.json` represent one current workspace. Future session IDs, URLs such as `/sessions/:id`, table relationships, access control, and historical storage WILL require API refactoring. This is deliberate because implementing sessions today adds more code than the MVP needs.
- **File-system to production storage:** local files are not safe on ephemeral/serverless hosting. Supabase transition isn't a literal change of one filename; Postgres schema, file bucket policies, error handling, and data migration are required. The storage interfaces minimize coupling but do not eliminate migration work. For Vercel, the 4.5 MB function payload limit also requires changes to the upload path (direct-to-object-storage with signed authorization for large files), not just swapping storage implementations.
- **Single-user to real minors' data:** the MVP has no access control. Never deploy it publicly with real children's submissions. Production needs authentication, authorization/RLS, consent, privacy assessment, upload scanning/limits, logging and retention/deletion policy before pilot use.
- **In-flight AI jobs:** the MVP performs synchronous HTTP model calls. A real queue/handoff product may need durable background jobs, idempotency, retry semantics, and streaming or polling. Defer until timeouts or concurrency justify them.
- **Regeneration complexity:** changing model output after a student has answered questions affects scoring meaning. Future runs must preserve `analysis_run_id`/probe versions, references to question/source revisions, and choice history. The MVP stores one successful generation only; a failed request can be retried.
- **Whiteboard versioning:** the MVP saves at most one final PNG for the brief; later timed snapshots, editable strokes, live collaboration, and provenance are extra storage/UX work. Do not add stroke-history infrastructure to this MVP.

## 2. What the MVP actually demonstrates

**Goal:** Provide a concrete answer to “Can an AI model interpret one student math problem, identify useful prerequisites, pose diagnostic multiple-choice questions, and summarize the evidence into an actionable Tutor Brief?”

**Exactly three screens:**

1. `/` — Student enters **one** math question as text and/or uploads multiple PNG/JPEG/WebP screenshots or PDFs. Any existing student work is simply another attachment, not a separate upload area. One hardcoded demo student profile provides Grade 9. **Only one mathematical question is permitted per intake; multiple attachments support that same question, including attempts.** No worksheet multi-question handling. Student clicks **Begin Session** (UI wording only; no session entity is created).
2. `/workspace` — **Left:** simple pen/eraser whiteboard. **Middle:** 3–5 pre-generated, multi-line MCQs with answers selectable and optional. **Right:** question breakdown with **Original / Parsed** toggle (Parsed default), topic/grade/difficulty, and a student-safe conceptual roadmap. Expand buttons animate one panel to 70% while the other two shrink to 15%. Student clicks **Submit**. The whiteboard PNG is sent to the AI **only now**, if not blank.
3. `/brief` — Same demo user views a standalone Tutor Brief: original problem, parsed version, probe answers and counts, possible strengths/gaps with concrete evidence, whiteboard observations when present, grade difficulty estimate, and suggested starting point. There is **no tutor account**.

**Exactly two AI operations** using Anthropic Claude Messages API and a narrow server-side adapter (no Claude Code runtime, no agent framework, no RAG, no regeneration):

- `analyzeQuestion`: problem + attachments + grade → parsed math question, student-safe concepts, private four-option MCQs/answer keys.
- `generateTutorBrief`: initial materials + deterministic probe results + optional final whiteboard PNG → tutor-facing narrative findings. Server attaches counts and answers rather than trusting the model to count.

**Persistence:** one current backend workspace in a local JSON file and binary attachments in a local directory; two small storage interfaces isolate the physical provider. Frontend keeps only ephemeral form, panel, ink, and current answer-selection state. In the current MVP, answers are persisted on Submit, not individually on every selection. No student/session history or database.

**Question display:** uncomplicated Markdown and KaTeX for text/equations. Original file viewer uses native browser preview. No charts, embedded interactive graphs, custom math editor, or separate transcription correction.

## 3. UX contract and deliberately constrained feature set

- Initial screenshot is a **visual reference**, not a requirement to reproduce every toolbar button or label. Respect the final ordering: **whiteboard LEFT, probing MIDDLE, breakdown RIGHT**.
- Expanded-panel animation changes widths but never unmounts the drawing canvas or clears selected answers.
- Initial breakdown is high-level *concepts*, not a solved answer. Do not show tutor-only error highlights before probing.
- Probe question cards must handle longer paragraphs and LaTeX, but don't invest in embedded diagram answers or an advanced math renderer.
- Students may leave any number of questions blank; final report explicitly distinguishes `unanswered` from `incorrect`.
- Error/loading messages should be useful. Simple retry of a **failed** provider call is sufficient. No successful regeneration, undo, redo, saved draft resumes, or cross-device persistence.
- Whiteboard only needs pen, eraser and invisible-to-user PNG export for the final AI call. No palette, shapes, text, cursor mode, collaboration or live AI monitoring.

## 4. What not to build (explicit MVP exclusions)

No login, onboarding, multiple accounts, role authorization, Supabase, session ID, session list, transcript capture, queue events, live tutor connectivity, learner-profile evolution, historical recommendations, tutor confirmation, curriculum retrieval, OCR pipeline, multi-question worksheet decomposition, continuous whiteboard analysis, AI regeneration, student transcription correction, whiteboard advanced tools, collaboration, analytics, deployment pipelines, job queues, or production-grade security integration.

Basic input validation, server secrets, avoiding unsafe HTML, not leaking correct answers before submission, and simple error states are **required safeguards**, not feature creep.

## 5. Implementation milestones, tests, and sign-off

**Testing is small but mandatory.** Use Vitest for local storage, upload validation, schema/privacy, scoring and brief-service checks; React Testing Library for selections, Original/Parsed and expand state; and **one** Playwright browser E2E using deterministic mocked Claude responses. Each test run uses a temporary local storage directory. No real model calls in automated tests, no test coverage target, no GitHub Actions/CI/CD. A genuine Anthropic smoke call is opt-in only.

| Stage | Implement | Mandatory acceptance gate |
| --- | --- | --- |
| **0. Platform smoke (FIRST)** | Next.js/React frontend, backend Route Handler, local filesystem temp write, server-only Claude SDK + mock, production build | `npm run dev` + `npm run start` each return page and JSON API; frontend fetch works; temp read/write works; mocked Claude output validates; typecheck/lint/build pass; optional live API status reported honestly |
| **1. Intake/storage** | One-problem typed/multi-attachment form; `CurrentWorkspaceStore`, `AssetStore`; local JSON/files; APIs | Typed/file inputs survive read-back, disallowed types fail, test files isolated, no session features |
| **2. Claude analysis** | Messages API with structured JSON, image/PDF inputs, 3–5 diagnostic MCQs and private answer keys | Mock validation and privacy tests pass; manually verify a text math example; real API only if explicitly enabled |
| **3. Student workspace** | Three panels, parsed/original display, math rendering, pen/eraser, panel animations | Browser interaction and component tests pass; resizing never wipes ink/MCQ state |
| **4. Brief and end-to-end** | Submit partial responses + optional final PNG; Claude brief + deterministic scoring; report and docs | Complete mocked Playwright path passes; zero/partial-answer handling correct; typecheck/lint/tests/E2E/build succeed |

**After each stage, Claude Code must run applicable commands, fix failing tests and report a short gate summary before proceeding.** Do not claim success if a live test was skipped. The concrete commands and test definitions are in `IMPLEMENTATION_PLAN.md` Sections 11–12.

### Immediately after the MVP is complete

1. **Validate value with tutors using synthetic Grade 4–12 examples.** Keep the MVP profile at Grade 9; use mocked grade inputs for evaluation if useful without building new UI. Collect feedback on probe quality, time-to-read, and whether the Tutor Brief changes where the tutor starts.
2. **Decide whether multi-user sessions or AI-quality improvements are the next bottleneck.** If the next target is a real pilot with users, implement auth/session/Supabase first; if it is a local proof-of-concept demo, refine prompting and tutor-brief UI within current boundaries.
3. **For multi-session backend migration:** introduce `sessions(id, student_id, tutor_id, status, created_at, ...)`, assets, analyses, probes, answers, whiteboard snapshots and briefs in Postgres; migrate data as needed; add `sessionId` routing and ownership checks; implement Supabase adapters; add auth/RLS before real users.
4. **For AI regeneration:** add `analysis_runs(id, session_id, source_revision, model, prompt_version, created_at)` and tie probing questions/answers to an immutable analysis run; establish which historical answers remain comparable. Only then add a UI Regenerate action and associated re-probing decisions.
5. **For actual tutor handoff:** introduce queue/tutor-arrival event, capture current partial answers, generate brief asynchronously, and let tutor view existing question/files immediately while the brief loads.
6. **For session completion:** attach transcripts and final whiteboard images, summarize separately, let tutor edit/confirm observations, and only then aggregate evidence into learner profile.

## 6. Operational caveats and development assumptions

- Run Next.js locally under Node with a writable filesystem. **Vercel build compatibility does not mean local JSON/files work in Vercel Functions.** Swap to remote persistence and direct uploads for large assets before deploying. Don't deploy publicly with private student data.
- Use **Anthropic Messages API** through `@anthropic-ai/sdk` in a server-only provider; `ANTHROPIC_API_KEY` in `.env.local`, `ANTHROPIC_MODEL` configurable (default `claude-sonnet-5-5`). Use `output_config.format` JSON Schema for structured results, validate with Zod, and pass files in image/PDF blocks. Mock by default and explicitly distinguish untested live calls.
- A Claude Console API key is used for **Mathify's AI calls**; Claude Code's coding authentication is a separate concern. Never expose the key in the browser or log it.
- Files: max 5 uploads, 10 MiB per file, 20 MiB combined, PDF/JPEG/PNG/WebP only. One math question, even if supporting attempts span multiple files. Multi-question worksheets are unsupported; do not implement detection or automatic splitting.
- Interface style: match the spirit of the supplied screenshot, but correct the ordering and remove extraneous whiteboard tools and tutor-only student-visible hints.
- The chosen storage/data contracts are not intended as a production generalized persistence framework. Keep them lean and change them deliberately when real sessions become a requirement.

**Bottom line:** architect for clear boundaries, **not** speculative features. Implement the workflow described in `IMPLEMENTATION_PLAN.md`. Document future session, Supabase, and regeneration costs instead of coding them prematurely.

## 7. Actual build notes (Stages 0-4, as implemented)

Recorded after building the MVP, for whoever picks this up next:

- **`output_config.format` + `zodOutputFormat()` are real and worked as specified.** The installed
  `@anthropic-ai/sdk` (0.134.0) ships a `zodOutputFormat()` helper (`@anthropic-ai/sdk/helpers/zod`)
  that converts a Zod v4 schema straight into the structured-output JSON Schema, matching this
  document's Section 6.1/6.2 exactly. No deviation was needed from the spec here.
- **`claude-sonnet-5-5` is a real, working model id**, confirmed against the live API (not just the
  assistant's training knowledge, which only knew of `claude-sonnet-5`). Kept as the default per
  this document's original `.env.example`.
- **Next.js 16's new `cacheComponents` feature (on by default in a fresh `create-next-app` scaffold)
  conflicts with `export const runtime = 'nodejs'`** on any route segment, which this app requires
  for its filesystem/Anthropic SDK routes. Fixed by setting `cacheComponents: false` in
  `next.config.ts`. Worth knowing if a future Next.js upgrade re-introduces the conflict.
- **jsdom has no `window.matchMedia`**, which the three-panel layout's narrow-viewport logic (and
  `prefers-reduced-motion` support) depends on. A small polyfill lives in `tests/setup.ts`.
- **Vitest's default test glob also matches `*.spec.ts`**, which collided with the Playwright E2E
  spec. `vitest.config.ts` explicitly excludes `tests/e2e/**` so `npm run test` and
  `npm run test:e2e` stay independent.
- No other deviations from this document or `IMPLEMENTATION_PLAN.md` were required. All four
  stages' acceptance gates (typecheck/lint/test/build, plus one real live Anthropic analysis call)
  passed as specified.
