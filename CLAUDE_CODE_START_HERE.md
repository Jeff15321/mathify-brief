# Claude Code: start here — Mathify MVP

Implement the Mathify Tutor Brief MVP from **`IMPLEMENTATION_PLAN.md`** and **`MVP_DESCRIPTION.md`** in this repository. **Read both completely before touching product code**, especially the opening migration risks in `MVP_DESCRIPTION.md` and Stage 0 in Section 12 of the implementation plan.

## Critical corrections to earlier plans

- The **Mathify application itself calls the Anthropic Claude API**, with a server-side `ANTHROPIC_API_KEY` from Claude Console, via `@anthropic-ai/sdk`. Do **not** implement OpenAI. Do **not** launch the Claude Code CLI or build a multi-tool agent in the application; two controlled Claude Messages API calls suffice. Your own Claude Code authentication method is independent.
- One question only per intake. Multiple images/PDFs may accompany it **only as supporting files or attempts**. No multi-question worksheets, splitting or question selection.
- No login, sessions, session IDs, Supabase, prompt regeneration, re-analysis, or Vercel deployment yet. One demo Grade 9 profile and a single current workspace backed by local **backend** JSON/files behind `CurrentWorkspaceStore` and `AssetStore`.
- Three screens: intake `/`; workspace `/workspace` (LEFT whiteboard, MIDDLE probing MCQs, RIGHT question breakdown); report `/brief`. Initial AI gets the uploaded question/supporting files, **not the whiteboard**. The whiteboard is exported and sent **only when generating the final Tutor Brief**.
- Keep standard Next.js App Router + Node Route Handlers and browser-facing storage-neutral APIs so Supabase and Vercel can be added later. **Do not claim the local-file version is deployable with persistent state on Vercel**; Vercel's storage and upload limits require a migration documented in `MVP_DESCRIPTION.md`.

## Mandatory execution order (verify each gate before continuing)

**STAGE 0 — Technology smoke test FIRST (no product features yet).** Inspect the repo; scaffold if necessary. Prove Next.js dev and production servers start; `/` returns 200; `GET /api/workspace` returns parseable JSON; the browser frontend successfully fetches that endpoint; Node can write/read in an isolated temporary folder; mock Claude returns schema-valid output using the server-only adapter; and typecheck/lint/build pass. If a key and explicit opt-in exist, run just one cheap live Anthropic text API call. Otherwise report `live Anthropic: skipped`, not a failure. Report the results as a Stage 0 checkpoint. Don't move on before foundational failures are fixed.

**STAGE 1 — Intake and backend storage.** Implement one-question uploads (typed text + multiple supporting PNG/JPEG/WebP/PDF) and the two small local backend stores/APIs. Gate: save/read files and current workspace with isolated unit tests; invalid uploads rejected; frontend→API works.

**STAGE 2 — Claude analysis.** Implement Anthropic image/PDF content blocks, schema-constrained output, validated 3–5 prerequisite MCQs, student-safe public response and deterministic mocked provider. Gate: mock tests verify math structure, private answer-key protection and whiteboard exclusion; optional, explicitly enabled real typed question smoke.

**STAGE 3 — Three-panel frontend.** Implement whiteboard (pen+eraser+PNG export), probing choices and Submit, Parsed/Original question display, KaTeX and panel expansion with stable mounted state. Gate: manual/component tests verify drawings and choices survive expand/restore; long math renders; no whiteboard is sent to initial analysis.

**STAGE 4 — Tutor Brief and verification.** Implement deterministic scoring with unanswered support; optional whiteboard included only in the second Claude model call; same-user report. Gate: Vitest tests, one mocked Playwright end-to-end test, lint/typecheck/build and documented manual checks pass. Update README with setup and test commands and `MVP_DESCRIPTION.md` with any *actual* migration complications encountered. No CI/deployment required.

## Working instructions

1. Preserve existing useful code/configuration; don't destructively overwrite unrelated files. Use the existing package manager or npm if the repository is new.
2. Keep backend-only secrets, filesystem code and Anthropic SDK out of client imports. Keep typed public DTOs, Zod contracts and narrow data/asset storage interfaces.
3. `AI_MOCK_MODE=true` must allow a completely offline end-to-end workflow. Automated tests must NEVER call paid Claude; run live smoke only with `RUN_LIVE_AI_SMOKE=1` and a key. Never log the key.
4. Always use an isolated temporary data directory for tests, not the developer's `data/`. Run and fix tests at each stage, without deleting meaningful failing tests.
5. After each stage, print a short checkpoint: changes made, tests/commands actually run and pass/fail, mock/live status, blockers. Continue automatically if the gate passes; ask only for missing necessary credentials or a real blocker.
6. Finish with a demo walkthrough, exact setup commands, test counts/status, files modified, skipped live validations, and known future changes (Supabase + Vercel direct upload, sessions, AI regeneration). Do not implement those future features now.

**Definition of done:** A demo student uploads exactly one question, Claude generates a breakdown and prerequisite probing questions, the student uses the left-whiteboard/middle-probing/right-breakdown workspace and submits any number of responses, and the same user sees a Tutor Brief with evidence, deterministic scoring, and optional whiteboard observations. The local MVP builds and tests cleanly.
