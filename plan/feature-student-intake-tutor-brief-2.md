---
goal: Improve student intake and produce an evidence based tutor handoff readable in 15 seconds
version: 1.0
date_created: 2026-11-09
last_updated: 2026-11-09
owner: Mathify project team
status: In progress
tags: [feature, ux, reliability, evaluation]
---

# Introduction

Implementation update (2026-11-09): the authorized PR stack starts from refreshed main `b1c8e0a`, which has merged AI quality review and tutor feedback. Preserve these features, including the runtime quality gate; references below to evaluating adoption of that gate describe the earlier research baseline and are superseded. See `mathify-pilot-protocol.md` for the six-PR execution order. Human evaluation remains pending.

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

The next version should let a student add their problem and answer short, purposeful checks in one workspace. A tutor should be able to identify the original task, a possible starting point, the response supporting it, and the evidence limits after a 15-second scan. This plan specifies the implementation, measurement, and pilot needed to evaluate that outcome. No application changes or participant studies have been performed under this plan.

Build on `main` at `9704035ac50ec095a5f02733943da25d8024efb3`. The locally available newer demo, `origin/feat/luke-excalidraw` at `3c89a3076e2dfa65487cc0f156b52e7854ad312e`, supplies selected reuse candidates. It contains confidence scoring, hints, Excalidraw, and a collapsed explanation that are absent from main. These refs are not confirmation of the deployed version that received feedback. Do not merge the newer branch wholesale.

The previous Codex research and completed Claude Fable critique support one workspace, an inline explanation and one begin action, short diagnostic items, a deterministic brief, and evidence facts in place of uncalibrated confidence. This plan incorporates that critique; the final plan itself has not received an additional Claude review.

Review trace: Orca run `run_abfe3af5986d`, task `task_e02fe5c045ae`, launched with `--agent claude --model fable`, completed successfully. Accepted tradeoffs include keeping one Begin action, deferring mid-session source revisions, and retaining the existing starting-point rule until tutors test it. Draft recovery remains in scope because losing work undermines the proposed seamless flow.

Verified starting points: the uploader already accepts multiple files; the remaining work is the surrounding flow and feedback. Main's Submit does not save the current selection, and a delayed asset upload can let report generation miss a concurrently saved answer. A partially completed all-correct attempt can also receive the false “Every main question was answered correctly” label. The newer demo's confidence rules can penalize students who miss core questions but answer the simpler follow-ups correctly. These findings determine the reliability-first implementation order below.

## 1. Requirements & Constraints

- **REQ-001**: Show intake, problem sources, whiteboard, preparation status, and probing in a persistent workspace. Allow selecting multiple files before one explicit **Let's begin** action. Retain typed-question entry.
- **REQ-002**: Before starting, say: “A few short checks help your tutor know where to start. It's okay to choose ‘I don't know.’” Repeat a shorter purpose line above the first check. Restore a visible preparation panel explaining what is happening and why; once analysis is available, show a concise roadmap of the skills being checked. Raymond's separate introduction screen is an alternative to test, not an additional mandatory page.
- **REQ-003**: Preserve 3–5 planned core concepts and at most one simpler follow-up per missed/IDK concept. Every generated question must target one prerequisite skill with one small calculation or conceptual decision. Early finish remains available.
- **REQ-004**: Persist the selected answer when finishing. Build the report from the current locked workspace state; never omit an acknowledged answer, fabricate an unshown follow-up, or describe missing answers as correct or incorrect.
- **REQ-005**: Preserve the current question's files, drawing, selection, and hint-access state across responsive changes, retry, and ordinary refresh. Show storage failure explicitly; never claim an unsaved draft is saved.
- **REQ-006**: The tutor's initial view shows the original problem, suggested start, concrete response and simpler-follow-up result, and coverage/unknowns. Original sources and work remain visibly accessible. Complete response details are expandable.
- **REQ-007**: Replace correctness/timing-based confidence with exact evidence coverage. Where the requested heading is retained, use **Confidence on the report** with evidence limits, without high/medium/low or a fabricated accuracy percentage. Never infer random clicking, motivation, mastery, or a learning style from these checks.
- **REQ-008**: On phones, purpose/checks are initially visible. If the student deliberately switches to drawing, announce readiness without switching tabs or stealing focus. Keep both panels mounted and make status/error messages accessible.
- **REQ-009**: Separate original problem sources from additional working images. Source files are editable before beginning. Adding work afterward does not regenerate questions. Correcting the original problem requires an explicit restart.
- **CON-001**: Scope is a supervised, local, single-workspace pilot. No session history, learning-style personalization, authentication, concurrent independent students, deployment, or new cloud analytics service. Pilot participants use isolated/reset workspaces sequentially.
- **CON-002**: Retain deterministic report generation; no new model call at submission. Retain next-pair prefetch. Additional runtime AI review is an evaluated option, not an automatic dependency of the UX change.
- **CON-003**: Keep current upload limits: five files, 10 MiB per file, 20 MiB combined; PNG/JPEG/WebP/PDF. Invalid or excess files produce explicit errors. PDF sources remain available as labelled links/previews; full PDF annotation is deferred.
- **CON-004**: Preserve existing documents and unrelated changes. Read `AGENTS.md` and the relevant installed Next.js guides before implementation. No branch switching, merges, publication, or live AI evaluation is part of completing this plan.
- **SEC-001**: Keep answer keys, unserved probes, and server credentials out of the student projection. Measurement events contain identifiers, counts, durations, and outcomes only; no uploaded content, filenames, answer text, or student names.
- **PAT-001**: Use `CurrentWorkspaceStore.update()` for one serialized state mutation. Stage slow asset/AI operations outside it, then validate workspace identity and operation ownership inside it. The existing lock only coordinates one Node process.
- **GUD-001**: Use precise counts before summary labels. Keep correct, incorrect, IDK, shown-unanswered, and not-reached distinct. Report hint access as “hint opened,” not proof of all assistance received.

### Measurement contract

The earlier 90% success and 30% faster proposals are aspirations to evaluate, not established benchmarks or a reason to declare a small pilot statistically conclusive. The 15-second exposure is the user's product target. Define each metric before comparing versions. Goal-linked measurement follows the approach described in [Google's HEART research](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/).

| Metric | Operational definition | Proposed target and interpretation |
|---|---|---|
| Upload task success | Assigned students who add both supplied existing photos and initiate preparation without assistance / all assigned students. Count failed and assisted trials; report assisted success separately. | Aim for at least 90% in a later adequately sized evaluation. In the initial pilot, show counts and each failure. |
| Preparation time | Observed time from the same task cue on a loaded screen to valid Begin, including picker interaction and correction. Exclude subsequent upload/AI wait and report it separately. Use existing photos; camera capture is a separate task. | Explore a 30% lower median than baseline. Also compare failures and slow trials; do not improve the median by dropping failures. |
| Purpose comprehension | After the task, student explains unprompted that the checks help the tutor identify where to start. “To get a score” alone does not pass. | Aim for at least 90%; count by first-exposure condition because prior exposure can teach the purpose. |
| Check discoverability | Students who independently find and save a response to the first available check / all assigned trials where a check became available. IDK counts as a response. | Aim for at least 90%. Separately report trials where generation never succeeded; this conditional rate cannot stand in for end-to-end success. |
| Handoff completion | Unique begun attempts that successfully produce a report / all unique begun attempts, including failed attempts. | Report by full versus partial evidence. A deliberate early finish can be a successful handoff. No unsupported numeric baseline. |
| Core coverage | Answered core concepts / planned core concepts, reported alongside answered/served simpler follow-ups. | Descriptive, not a completion quota. Never pressure students to maximize this measure. |
| Tutor comprehension in 15 seconds | After a 15-second view, tutor correctly identifies the original task, a defensible starting move, one actual supporting observation, and one evidence limit. All four must pass. | Aim for at least 90% of scenario trials in a later evaluation. Report pilot counts per tutor and case; repeated cases are not independent participants. |
| Question quality | Proportion of generated pairs meeting all simplicity/relevance rubric items; correctness, uniqueness, and leakage are assessed separately. | Aim for at least 90% on the frozen reviewed set. Zero unresolved wrong keys, ambiguous correct options, or solution leaks in the set used with participants. This is not a guarantee about arbitrary future generation. |
| Reliability | Saved-answer preservation, accurate coverage, draft recovery, and explicit export-failure handling in the test matrix below. | Every specified regression case passes; no known data-loss or misleading-report defect remains in tested scope. |
| System wait | Browser Begin-to-first-ready and ready-to-visible; server analysis/pair durations separately. Report sample count, median, p95 when sample size supports it, failures, and retries. | Establish baseline. Do not mix model/prompt/network conditions, subtract different clocks, or set a speed threshold for student sincerity. |

For rates, retain defined starts and failures in the denominator. Distinguish report completion from the educational outcome, following the general measurement principle in the [GOV.UK completion-rate guide](https://www.gov.uk/service-manual/measuring-success/measuring-completion-rate). Its separate-page implementation advice is not adopted for this single-workspace design.

### Proposed state and request contracts

- Canonical student route: `/workspace`. `/` opens that route. `/workspace?new=1` opens a fresh local draft without deleting the current server report; successful Begin creates/replaces the singleton. Refreshing an existing workspace resumes it, and a network error offers Retry instead of silently returning to intake.
- UI states: `draft`, `uploading`, `analyzing`, `probing`, `submitting`, `complete`; recoverable error is attached to the active state. The board stays mounted through state changes. Loading never automatically submits or replaces a draft.
- Add an immutable UUID `workspaceId`, returned by start/read and required by subsequent mutations. Use a stable client `draftId` to make retried start requests idempotent. This guards the singleton against stale tabs; it is not session-history or editable-source revision infrastructure.
- Use schema version 5 and brief version 6 for this pilot, avoiding the known v3/v4 workspace and v4/v5 brief formats. Develop and evaluate in a separate `LOCAL_DATA_DIR`. Unsupported schemas return an explicit upgrade-required state rather than masquerading as no workspace. Preserve existing files; migration of historical reports is outside this pilot.
- Finish carries `workspaceId`, `submissionId`, an optional `{ probeId, answer, hintOpened }`, and an optional board export or explicit omitted-export state. Under one update, validate identity and phase, apply the pending answer without advancing to an unshown question, compute results from that updated state, and persist the brief/completion receipt. Do not call `advance()` unchanged from Finish because it marks an easier question served.
- A retry with the same completed `submissionId` returns the stored result. A mismatched workspace or conflicting submission returns a recoverable conflict. Staged assets not referenced by the committed workspace are cleaned up outside the lock; assets from another workspace are never attached or deleted by a stale request.
- Analysis is claimed by operation ID before the model call; a duplicate joins/observes the current operation. Failure enables retry on the same input. A refresh during analysis observes status; it does not recreate the workspace or issue an unowned duplicate call.
- Browser drafts use IndexedDB, scoped by `draftId`/`workspaceId`: typed text, selected file blobs/order, board scene and binary files, current selection, and hint state. Writes are debounced to at most 500 ms, flushed on stroke end and explicit actions; show Saved only after acknowledgement. Preserve the last committed checkpoint if the browser is killed. Clear the relevant draft on successful completion or explicit discard; expire abandoned drafts after 24 hours on the next application visit. Handle unavailable/quota-limited storage visibly.
- Original file identifiers and student-added board elements remain distinguishable. Imported photos alone do not produce “student wrote work” evidence. Raw originals remain readable separately from the composite export.

## 2. Implementation Steps

Tasks are planned, not completed. A dependency named in a task must finish before that task starts. Tasks without a dependency on one another can be scheduled separately; this does not authorize additional agents. Implementation verification is scoped to each change; the integrated suite runs before the pilot.

### Implementation Phase 1

- **GOAL-001**: Establish a reproducible baseline and measurement definitions before changing behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Record baseline refs, model/prompt version, mock/live mode, viewport/device and network conditions in `plan/mathify-pilot-protocol.md`. Use main as the implementation base and record the newer demo separately. If the actual stakeholder build becomes known, add its pinned identity as a baseline; do not silently relabel main as that demo. Snapshot fixed problems/reports with synthetic data in `tests/fixtures/pilot/`. Preserve the original UI as the comparison condition. | No | Not started |
| TASK-002 | Create `plan/mathify-pilot-protocol.md` with the task instructions, scoring rubric, exclusions and studies in section 6. Create `plan/mathify-pilot-results.csv` with columns `participant_code,role,condition,case_id,device,input_method,assisted,success,elapsed_ms,problem_ok,start_ok,evidence_ok,limits_ok,failure_code`. Leave it header-only until observations exist. Depends on TASK-001. | No | Not started |
| TASK-003 | Add a small local measurement sink in `src/lib/measurement.ts`, gated by `NEXT_PUBLIC_MEASUREMENT_ENABLED=true` for study builds. Capture the events below; retain them locally across refresh and export using the study harness, without adding a student analytics screen. Add `.env.example` documentation and ignore `/artifacts/pilot/` in `.gitignore`. Instrument baseline and candidate consistently before comparing event-derived durations. Depends on TASK-001. | No | Not started |

Exit evidence: pinned baseline configuration, frozen tasks/fixtures, tested event definitions, and no fabricated baseline values. Recruitment can proceed while reliability work begins; do not reinterpret later measurements as a pre-change baseline.

### Implementation Phase 2

- **GOAL-002**: Make saved responses and report evidence reliable before visual simplification.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Update `src/types/domain.ts`, `src/schemas/workspace.ts`, storage error handling, `workspace-service.startWorkspace`, API routes and `src/lib/api-client.ts` for the identity/schema/idempotency contracts above. Keep existing demo data untouched by using a separate data directory. Reject stale-tab mutations; never silently accept a reused `s1-main` from a previous workspace. Depends on TASK-001. | No | Not started |
| TASK-005 | Update `src/server/brief-service.ts::submitBrief`, `src/server/helpers/probe-flow-helper.ts`, `src/app/api/brief/route.ts`, and `WorkspacePage.handleSubmit` to implement atomic selected-answer finalization and safe staged-asset cleanup. Preserve already acknowledged answers saved during an export. Add same-submission retry handling. Depends on TASK-004. | No | Not started |
| TASK-006 | Update `PriorityStepCard` and `brief-summary-helper` to derive all-correct/partial/no-evidence wording from exact tallies. Keep IDK distinct from wrong, and unreached distinct from unanswered. Introduce `src/server/helpers/evidence-summary-helper.ts` for assistance/coverage facts. Do not port the newer confidence penalty logic. Depends on TASK-004. | No | Not started |
| TASK-007 | In `ThreePanelLayout` keep responsive panels mounted, initially show checks/purpose on narrow screens, and preserve a deliberate drawing-tab choice. In `WorkspacePage`, keep the current view on fetch failure and offer Retry. Add accessible status announcements through `LoadingState`. Depends on TASK-001. | No | Not started |
| TASK-008 | Add focused regressions to `tests/brief.test.ts`, `tests/scoring.test.ts`, `tests/probes.test.ts`, `tests/storage.test.ts`, and `tests/components.test.tsx`. Include the two reproduced report defects, late generation/replacement, duplicate finish, and selected-answer finish without synthetic retry. Run the relevant suites. Depends on TASK-004, TASK-005, TASK-006, TASK-007. | No | Not started |

Exit evidence: no selected/acknowledged answer loss in the concurrency cases; all partial/no-evidence states are truthful; mobile tab changes preserve state. Any unresolved evidence-integrity failure blocks participant testing.

### Implementation Phase 3

- **GOAL-003**: Deliver one recoverable workspace from upload through probing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Refactor `src/app/workspace/page.tsx` into a persistent shell/controller that supports the UI states above; make `src/app/page.tsx` the entry redirect and update the new-question link in `TutorBriefView`. Reuse `QuestionIntakeForm` as a panel rather than a separate screen. Add `src/components/workspace/PreparationPanel.tsx` for purpose/status and `src/lib/workspace-flow.ts` for explicit transitions. Adapt the unused `BreakdownPanel` into a short, initially visible concept roadmap after analysis, with optional detail. Generate that roadmap from the actual concept plan; do not pair differently sized breakdown/plan arrays by index or reveal the original solution. While analysis is pending, explain the preparation purpose and show actual operation state, without invented progress percentages or steps. Claim/recover analysis in `analysis-service.ts` and `/api/analyze`. Depends on TASK-004, TASK-007. | No | Not started |
| TASK-010 | Update `QuestionIntakeForm`, `FileAttachmentList`, and `QuestionDisplay` for batch selection, drop/paste, thumbnails, remove/reorder, labelled PDFs and immediate limit/type errors. Preserve the accessible picker; do not port silent `slice(0, MAX_FILES)` truncation or a cancel-dependent permanent lock. Flag exact duplicates using a content hash without silently deleting them. State that all sources belong to one problem. Depends on TASK-009. | No | Not started |
| TASK-011 | Port only the newer Excalidraw wrapper/editor, font-copy script and corresponding dependency/asset configuration from the pinned newer demo; verify installed React/Next compatibility before treating the port as ready. Adapt `WhiteboardPanel` so sources appear once, are separately accessible, and extra inserted images are labelled work rather than new analysis input. Keep PDFs accessible without promising board rendering. Depends on TASK-009. | No | Not started |
| TASK-012 | Add `src/lib/workspace-draft.ts` for the IndexedDB contract. Restore draft before seeding the board, so restoring scene binaries and importing source images cannot duplicate them. Persist typed input/files, drawing, current selection and hint state; report storage failure and last saved state. On export failure offer Retry or explicit Send without drawing; the brief records that state. Depends on TASK-010, TASK-011, TASK-005. | No | Not started |
| TASK-013 | Add browser journeys in `tests/e2e/student-workspace.spec.ts`: two photos, file-limit/cancel/reselect, typed-only, PDF-only, slow preparation while drawing, refresh/retry, source restart, mobile visibility, and export failure. Add focused draft and whiteboard tests. Verify real camera/gallery behavior separately on supported devices. Depends on TASK-012. | No | Not started |

Exit evidence: one Begin action, no forced route change after analysis, both photos retained, visible purpose, recoverable failures, draft restoration from acknowledged checkpoints, and no source/scene duplication.

### Implementation Phase 4

- **GOAL-004**: Produce short diagnostic checks whose mathematics and purpose can be evaluated.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Update shared `PROBE_RULES` in `src/server/ai/prompts.ts` for the prompt contract below; apply it to the first and subsequent pairs. Keep 3–5 concepts and the same-concept simpler follow-up. Version new outputs as `analysis-v3`/`probe-pair-v3` in provenance. Extend structural validation in `src/schemas/analysis.ts` to require exactly four options and distinct normalized option content; do not confuse string normalization with proof of mathematical inequivalence. Depends on TASK-004. | No | Not started |
| TASK-015 | Retain the newer demo's optional hints by porting the hint schema/projection/UI together and sending `hintOpened` with both Next and Finish. Questions must remain understandable without opening a hint. Persist opened state immediately in the draft; keep imported/legacy unknown distinct from false. Use `ProbeCard`, `probe-service`, `api-client`, domain schemas, and the evidence helper. Keep IDK styling consistent with existing deliberate design. Depends on TASK-014, TASK-012. | No | Not started |
| TASK-016 | Create `scripts/evaluate-probes.ts` and `tests/fixtures/probe-evaluation/` using the study contract below. Mock mode verifies plumbing only. Live evaluation requires an explicit bounded command, outputs provenance/tokens/timings and all failures, and does not run in normal tests. Have two math tutors independently rate generated pairs before adjudicating disagreements. Depends on TASK-014. | No | Not started |
| TASK-017 | Compare the baseline, simpler-prompt candidate, and optional correctness-review variant against the same frozen cases. Inspect pinned `qiuethan/ai-review` (`e07a4dc`) rather than assuming the newer `/api/validate` endpoint gates the flow. Keep runtime review out of the default until its measured quality/latency tradeoff is recorded. Use reviewed fixed items for the first UX study; failed reviewed items never reach participants. Depends on TASK-016. | No | Not started |

Exit evidence: complete provenance and ratings for the reviewed evaluation set; zero unresolved key/uniqueness/leakage failures in participant fixtures; simplicity defects recorded and corrected. A failed or unperformed live evaluation cannot be represented as prompt improvement.

### Implementation Phase 5

- **GOAL-005**: Give tutors an accurate first view with optional evidence detail.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-018 | Refactor `TutorBriefView` and supporting cards around original task/source preview, one suggested start, supporting response plus follow-up outcome, and exact coverage. Add `src/components/brief/StartingPointCard.tsx` and `EvidenceSummary.tsx`; retain readable source/work access and put tallies/metadata/full responses in labelled disclosures. Reuse outcome-grouping ideas from `qiuethan/simplify-report` (`3ef1052`), not its unfinished layout wholesale. Depends on TASK-006, TASK-015. | No | Not started |
| TASK-019 | Use deterministic templates for clear miss, simpler recovery, IDK, all answered correct, partial evidence, and no evidence. Initially retain first-missed-main order, state why it was selected, and show the retry result; allow a compact additional concern. Use generic educator-written opening moves rather than another AI call. Include the requested confidence heading with factual coverage only. Do not call source-only images original student work or infer unaided success. Depends on TASK-018. | No | Not started |
| TASK-020 | Add `tests/e2e/tutor-brief.spec.ts` and fixture/component tests covering every report state, long math, multiple photos, PDF-only source, missing export, keyboard disclosures, and phone/desktop widths. Check that the four key facts are visible in the target desktop viewport; allow reading/scrolling on small screens without clipping. Browser checks establish rendering, not human 15-second comprehension. Depends on TASK-019. | No | Not started |

Exit evidence: report content matches persisted observations in every fixture, no unexplained confidence category remains, and detailed evidence is accessible without crowding the first view.

### Implementation Phase 6

- **GOAL-006**: Compare the complete candidate to the pinned baseline and decide the next iteration from observed evidence.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Run integrated `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e` with mock AI and isolated data. Review actual mobile/desktop screenshots and keyboard/status flows. Use the installed Next.js testing guide; do not reuse a developer server that may have live AI enabled. Depends on TASK-008, TASK-013, TASK-020. | No | Not started |
| TASK-022 | Run the student and tutor protocol below using fixed, reviewed content. Preserve each tested build and condition; make no changes mid-round. Log observed counts, help, errors and timings, then repair and retest failures with fresh participants. Recruitment and observations are human dependencies, not simulated by agent review. Depends on TASK-002, TASK-003, TASK-017, TASK-021. | No | Not started |
| TASK-023 | Summarize results in `plan/mathify-pilot-results.md`: counts, per-case/per-tutor outcomes, timing distributions, reliability failures, observed misunderstandings and decisions. Keep the earlier numeric targets visible as targets; do not retrospectively redefine success. Mark broad improvement unproven if sample/design cannot establish it. Recommend a larger precision/power-planned study only if a population claim is needed. Depends on TASK-022. | No | Not started |

Exit evidence: no unresolved release-blocking reliability/content defect; a recorded disposition for each observed usability failure; measured results clearly distinguished from aspirations. Missing human or live-model results leave the corresponding evaluation open rather than making the release successful by default.

### Measurement events

Use `eventId`, `attemptId`, nullable `workspaceId`, `viewId`, `uiVersion`, `promptVersion`, `mode` (`mock`/`live`/`reviewed-fixture`), `eventName`, `eventSequence`, device class, and structured count/error fields. Deduplicate by `eventId`; retries keep the same attempt identity. Client durations use one monotonic clock within a view; persist accumulated segments when refreshing. Server durations use a server clock. Wall-clock timestamps are for correlation, not subtraction across devices.

| Event group | Required events and meaning |
|---|---|
| Intake | `draft_opened`, `files_added`, `file_rejected`, `begin_clicked`, `upload_succeeded`, `upload_failed`; counts and MIME classes, not filenames/content. |
| Preparation | `analysis_started`, `analysis_ready`, `analysis_failed`, `analysis_retry`; record operation identity and server duration separately. |
| Probing | `probe_ready`, `probe_visible`, `hint_opened`, `answer_saved`; visible requires the active tab and visible document, while saved requires server acknowledgement. A refresh can create a new visibility segment, not a new answered question. |
| Handoff | `finish_clicked`, `brief_saved`, `brief_visible`, `export_failed`, `export_omitted`; include full/partial coverage counts and explicit omission. |
| Recovery | `draft_saved`, `draft_restored`, `draft_save_failed`; test last-acknowledged checkpoint rather than claiming persistence of every uncommitted keystroke. |

The observer records assistance, purpose comprehension and tutor answers separately; events cannot infer those outcomes. Missing telemetry remains unknown, not automatic success or abandonment. Separate test/internal traffic from pilot observations.

### Prompt contract

> Each probe checks exactly one prerequisite skill through one small calculation or conceptual decision. Use concise, direct wording and familiar terms. Prefer simple numbers unless the target skill requires otherwise. Remove irrelevant context and unnecessary steps. Provide four mathematically distinct options with exactly one correct answer; plausible wrong options should reflect specific errors. Verify the key. The simpler follow-up must test the same skill with less computation or appropriate scaffolding. Do not reveal the original problem's solution. If a hint is present, it may suggest an approach without identifying the correct option.

Use approximately 25 words as an editing target, not a universal rejection threshold. Preserve necessary units, diagrams and conceptual verbal options. The requirement is easy to understand and answer when the prerequisite is understood, not a forced high correct-answer rate. [Diagnostic-question practice guidance](https://www.aft.org/ae/summer2018/barton) and [official formative MCQ guidance](https://www.australiancurriculum.edu.au/resources/formative-assessment/designing-formative-assessment/multiple-choice-questions) support the single-concept, clear-language and plausible-alternative criteria; neither establishes effectiveness of this implementation.

## 3. Alternatives

- **ALT-001**: Separate intro page/modal. More prominent acknowledgement, but another step and repeated interruption. Start with inline purpose; reconsider only if first-exposure comprehension remains poor.
- **ALT-002**: Analyse immediately after each upload. Removes one click but can analyse an incomplete two-photo problem, duplicate paid work and invalidate questions. Keep explicit Begin after assembling the batch.
- **ALT-003**: Reduce all plans to three or serve easier questions first. May reduce burden but removes coverage or main/follow-up contrast. First measure clearer wording and early finish; do not change question count and layout simultaneously in the first comparison.
- **ALT-004**: Retain a numerical/categorical confidence score. Compact, but the existing rules conflate difficulty with unreliable evidence. Show coverage/assistance/unknowns; calibrating diagnostic accuracy is separate future research.
- **ALT-005**: Generate the brief with another model call. More flexible prose at the cost of latency and unsupported inference. Use deterministic facts and educator-written templates.
- **ALT-006**: Adopt full AI review before every question immediately. Can catch errors but adds serial cost, latency and false rejections. Benchmark; prefetch generation plus review if adopted. Structural checks alone do not certify correctness.
- **ALT-007**: Allow original-question edits during probing with automatic regeneration. Convenient but requires a source-version/answer-invalidation design. Defer; explicitly restart instead. This does not defer stale-workspace identity guards.
- **ALT-008**: Retain the simple raster board. Smaller dependency surface, but limits editable images/text and recoverable scenes compared with existing Excalidraw work. Prefer selective Excalidraw reuse with compatibility verification; do not assume the previous branch is already integrated.
- **ALT-009**: Hide all original work to maximize report density. Reduces visual clutter but removes context. Show source/work access in the initial view and disclose detailed records progressively, consistent with [progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/).

## 4. Dependencies

- **DEP-001**: Source baseline is main `9704035`; selected newer reuse source is `3c89a30`. Neither local reference establishes current deployment parity. Recheck changes before implementation; preserve unrelated edits.
- **DEP-002**: Installed Next.js 16.4.1 and React 19.3.0; use `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `03-layouts-and-pages.md`, and `02-guides/testing/` rather than older assumptions. Excalidraw is absent on main; its newer dependency, client-only loading and local font setup must move together.
- **DEP-003**: Existing local storage is one process/one workspace. Separate research instances or sequential sessions are required; no parallel student/tutor persistence is implied.
- **DEP-004**: Recruitment of representative students and math tutors, supported target devices, and the team's existing participant process are prerequisites for the human pilot. No one has been contacted or enrolled by creating this plan.
- **DEP-005**: Live prompt evaluation requires a configured server-side provider and an explicitly enabled, bounded run. Automated application tests remain mocked. The initial reviewed-fixture UX study can proceed independently of runtime generation latency testing.
- **DEP-006**: A template editor/math tutor supplies and verifies question truth and acceptable tutor openings. An AI reviewer can assist, but cannot supply human usability or learning-outcome evidence.

## 5. Files

- **FILE-001**: `src/app/page.tsx`, `src/app/workspace/page.tsx`, `src/lib/workspace-flow.ts` — entry, persistent shell and UI state transitions.
- **FILE-002**: `src/components/intake/QuestionIntakeForm.tsx`, `FileAttachmentList.tsx`, `src/components/workspace/PreparationPanel.tsx`, `BreakdownPanel.tsx`, `QuestionDisplay.tsx` — source intake and explanation.
- **FILE-003**: `src/components/workspace/ThreePanelLayout.tsx`, `WhiteboardPanel.tsx`, `src/components/whiteboard/SimpleWhiteboard.tsx`, new `ExcalidrawEditor.tsx`, `src/lib/workspace-draft.ts` — responsive preservation, board integration and draft recovery.
- **FILE-004**: `package.json`, `package-lock.json`, new `scripts/copy-excalidraw-assets.mjs`, `.gitignore` — selected dependency/asset integration and generated-artifact handling.
- **FILE-005**: `src/types/domain.ts`, `src/schemas/workspace.ts`, `src/server/storage/local-workspace-store.ts`, `src/server/workspace-service.ts`, `src/server/analysis-service.ts`, workspace/analyze API routes — identity, schemas and analysis recovery.
- **FILE-006**: `src/server/brief-service.ts`, `src/server/probe-service.ts`, `src/server/helpers/probe-flow-helper.ts`, probe/brief API routes, `src/lib/api-client.ts` — atomic finalization, assistance and retry contracts.
- **FILE-007**: `src/server/ai/prompts.ts`, `src/schemas/analysis.ts`, `src/server/ai/mock-provider.ts`, provider provenance plumbing, new `scripts/evaluate-probes.ts`, `tests/fixtures/probe-evaluation/` — question design and evaluation.
- **FILE-008**: `src/server/helpers/brief-summary-helper.ts`, new `evidence-summary-helper.ts`, `src/components/brief/TutorBriefView.tsx`, `PriorityStepCard.tsx`, new `StartingPointCard.tsx`, `EvidenceSummary.tsx`, existing result/source components — report content and layout.
- **FILE-009**: `src/lib/measurement.ts`, `.env.example`, `src/components/shared/LoadingState.tsx` — study instrumentation and accessible status.
- **FILE-010**: Existing `tests/brief.test.ts`, `scoring.test.ts`, `probes.test.ts`, `storage.test.ts`, `components.test.tsx`; new draft/evaluation tests and `tests/e2e/student-workspace.spec.ts`, `tutor-brief.spec.ts` — focused behavior verification.
- **FILE-011**: `plan/mathify-pilot-protocol.md`, `plan/mathify-pilot-results.csv`, `plan/mathify-pilot-results.md`, `tests/fixtures/pilot/`, `README.md` — protocol, observations, fixture provenance and updated walkthrough. Results files are future outputs, not observations fabricated during planning.

## 6. Testing

- **TEST-001**: Selected answer + Finish; acknowledged answer arriving during delayed board upload; two Finish requests with one submission ID; stale-tab request after replacement; failed export; late generation after complete. Assert exact persisted answers/results, no unshown retry, correct conflict/retry behavior and no wrong-workspace asset mutation.
- **TEST-002**: Report fixtures for no answers, all IDK, all wrong, partial all-correct, complete all-correct, main wrong/simpler correct, hinted correct, assistance unknown and unreached concepts. Assert literal counts, appropriate starting copy, and no mastery/random-clicking claims.
- **TEST-003**: Two-photo selection, repeated picker/cancel, sixth file, exact duplicate, unsupported type, oversized file/total, reorder/remove, text-only, PDF-only. Assert preservation or explicit rejection, never silent loss. Test camera/gallery separately on actual devices.
- **TEST-004**: Desktop expand/restore, narrow tab switch, breakpoint crossing, refresh before/after Begin, analysis retry, refresh during preparation, scene/binary restoration and draft quota failure. Assert last acknowledged draft checkpoint, no duplicate source import, correct workspace identity and accessible recovery.
- **TEST-005**: Keyboard-only journey, labelled controls, status announcements and errors, readable math, mobile check discoverability and no focus stealing while drawing. Follow [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) and [form-notification guidance](https://www.w3.org/WAI/tutorials/forms/notifications/).
- **TEST-006**: Instrumentation event deduplication, same-attempt retry, ready versus visible, server-acknowledged save, hidden-tab visibility, and mocked/live labels. Seed known event sequences and assert the metric numerator/denominator; no claim of comprehension may be inferred from clicks.
- **TEST-007**: Prompt benchmark and two-tutor rubric described below. Mock generation tests schema/plumbing only; no accuracy or ease claim from mock results.
- **TEST-008**: The student and tutor pilot below. Browser screenshots and model agreement cannot substitute for it.

### Student study

Use two formative rounds of five fresh students, selecting for the devices and reading/math needs expected in the pilot. The first round identifies problems; repair them before the second. Do not pool changing builds into one success rate. This is a practical discovery sample, not a population-level 90% estimate: [NN/G explains the distinction between small qualitative and quantitative samples](https://www.nngroup.com/articles/5-test-users-qual-quant/).

Within each round, assign old/new order alternately and use matched but different two-photo problems. First exposure is the primary purpose-comprehension observation. Record carryover/order effects; later exposure cannot establish first-use learnability. Keep the model output and delay fixed/matched so the interface comparison does not accidentally compare different question quality or network conditions.

Task cue: “Use these two photos to get ready for your tutoring session.” Then let the student proceed independently. Record assistance as soon as it occurs. After the timed task, ask what the checks were for, what they expected to happen next, and whether anything was confusing. Use separate recovery tasks for refresh, failed generation and file limits. Do not interrupt timing with think-aloud questions; that changes task duration, as discussed in [NN/G's success-rate guidance](https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/).

### Tutor study

Recruit six to eight tutors. Prepare six evidence patterns: clear miss, simpler recovery, complete correct, all IDK, partial all-correct and no answers. Give each tutor matched cases split across old/new layouts, counterbalance layout order and case assignment, and do not repeat the identical student's answers in both conditions.

Start the 15-second exposure after the page/fonts/images are ready; allow normal scanning and interaction during that window. Hide the page, then ask the four comprehension questions in the metric contract. A tutor's starting move need not match the app's suggestion: it passes if it is defensible from the evidence. Before testing, two math reviewers define acceptable answers for each case; adjudicate disagreements without knowing the UI condition. Record unsupported certainty separately as a critical interpretation error. Analyze counts per tutor and scenario, not dozens of trials as independent tutors.

This isolated scan measures handoff comprehension. It does not prove better teaching or learning. If a later efficacy study is needed, assess the usefulness of the tutor's actual first interaction separately.

### Prompt benchmark

Freeze 20 synthetic, tutor-checked source problems: five each covering algebraic expressions/equations, fractions/proportion, geometry/measurement and linear relations/representations. Across the set include typed, two-photo, handwritten and PDF inputs. Add four separate ambiguous/unreadable or multiple-problem negative cases; assess their recovery rather than treating them as ordinary items to solve.

Use ten cases for prompt development and ten held out for comparison. Generate two runs per normal case per compared variant to expose variability; record model ID, prompt version, parameters, input hash, schema/semantic failures, retries, tokens, and per-operation latency. Evaluate every generated main/follow-up pair, not just the first pair. Interleave variant runs to reduce load/time confounding. Any prompt edit after seeing held-out results requires a fresh held-out check before a new claim.

Two tutors independently rate: correct key; exactly one mathematically correct option; relevant single skill; clear wording; plausible wrong alternatives; same-skill simpler follow-up; no solution/hint leakage. Correctness/uniqueness/leakage are separate blockers; do not average them away with high readability ratings. Treat approximate stem length as a diagnostic, not proof of simplicity. Resolve tutor disagreements explicitly. Log failed generation in the total rather than reporting only valid outputs.

Do not publish fine-grained latency percentiles from tiny per-device samples; give sample size/range and separate operational runs from human observations. If broad quantitative claims are required, size a later study from baseline variability, desired precision and detectable effect; neither 10 students nor repeated tutor cases is a substitute.

### Decision rules

1. Any unresolved reproducible answer loss, silent file loss, wrong-workspace mutation, false report assertion or known incorrect participant item blocks the candidate pilot release.
2. Repeated inability to begin/find checks or repeated misunderstanding of evidence triggers a targeted design revision and another formative round. Passing a small round permits further evaluation, not a claim of population effectiveness.
3. Retain numeric aspirations in the results table even when missed. Show observed counts and conditions, uncertainty and missing data. A faster successful subset with more failures is not an improvement.
4. Do not optimize all-questions completion by hiding Finish, penalizing IDK or making questions trivial. The user outcome is a useful, honest handoff.

## 7. Risks & Assumptions

- **RISK-001**: The feedback may concern the newer demo rather than main. Preserve both pinned descriptions; confirm deployed parity before attributing a measured improvement to last week's experience.
- **RISK-002**: Excalidraw adds bundle/dependency and scene-storage complexity. Measure initialization/export and verify device behavior; draft restoration must not duplicate imported images.
- **RISK-003**: Local browser storage can fail or be cleared. Acknowledged checkpoints, visible save errors and explicit export omission define the recovery promise; no guarantee survives user-cleared storage.
- **RISK-004**: Easier items can lose diagnostic relevance. Keep curriculum coverage and semantic review separate from wording/count metrics.
- **RISK-005**: A compact suggested start can anchor tutors to an incorrect interpretation. Show the observed response, follow-up and limits; test defensible alternate starts rather than requiring agreement with the algorithm.
- **RISK-006**: A small convenience sample, order effects and repeated tutor cases can overstate improvement. Report descriptive evidence and plan a larger study if a population claim is needed.
- **RISK-007**: Faster UI can expose slower generation more often. Measure first-ready and inter-question wait separately; preserve prefetch and avoid unmeasured latency promises.
- **RISK-008**: Broadly porting experimental branches can reintroduce confidence penalties, schema incompatibilities or unfinished report behavior. Select files/behaviors with explicit tests instead of merging all changes.
- **ASSUMPTION-001**: The next deliverable is a supervised pilot/demo, not a multi-user production launch. If that changes, revise storage/identity/access architecture before implementation rather than treating it as a deployment-only change.
- **ASSUMPTION-002**: Problem edits after beginning can use explicit restart for this version. Routine additional working images remain possible without reanalysis.
- **ASSUMPTION-003**: Tutors primarily scan on desktop, but phone readability is still tested. Do not generalize a desktop 15-second result to phones.
- **ASSUMPTION-004**: The requested confidence heading can remain while the unvalidated score is removed. Its interpretation is tested; no calibrated probability is promised.
- **ASSUMPTION-005**: No new study or paid generation has run during planning. Earlier research ran 80 main-branch unit/component tests successfully and isolated reproductions of the partial-report and finalization defects. Those historical checks are not verification of this unimplemented plan.

## 8. Related Specifications / Further Reading

- [Existing MVP scope](../MVP_DESCRIPTION.md) and [original implementation specification](../IMPLEMENTATION_PLAN.md). This plan changes the next-version student/report experience; it does not authorize executing the old specification's unrelated instructions.
- [Current setup and tests](../README.md).
- [Google research on mapping goals to UX metrics](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/).
- [GOV.UK completion-rate definitions](https://www.gov.uk/service-manual/measuring-success/measuring-completion-rate).
- [NN/G qualitative versus quantitative samples](https://www.nngroup.com/articles/5-test-users-qual-quant/) and [task success versus timed think-aloud](https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/).
- [Barton on diagnostic questions](https://www.aft.org/ae/summer2018/barton) and [Australian Curriculum formative MCQ guidance](https://www.australiancurriculum.edu.au/resources/formative-assessment/designing-formative-assessment/multiple-choice-questions).
- [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) and [W3C cognitive instructions guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/).

Execution starts with TASK-001. Completion of this planning document does not mark any implementation or evaluation task complete.
