# Mathify pilot protocol

Implementation baseline: `b1c8e0a` (main refreshed 2026-11-09). Research baseline: `9704035`; newer demo comparison: `3c89a30`. Confirm which deployed build received the stakeholder feedback before attributing improvements to that experience. Current main includes mandatory AI quality review and persistent tutor feedback; preserve both.

## PR sequence

1. [PR #9](https://github.com/Jeff15321/mathify-brief/pull/9), `feat/pilot-baseline` → main: plan, protocol, opt-in local measurement.
2. [PR #10](https://github.com/Jeff15321/mathify-brief/pull/10), `feat/pilot-integrity` → previous branch: workspace identity, safe finalization and honest evidence.
3. [PR #11](https://github.com/Jeff15321/mathify-brief/pull/11), `feat/pilot-workspace` → previous branch: one workspace, batch uploads, preparation, whiteboard and recovery.
4. [PR #12](https://github.com/Jeff15321/mathify-brief/pull/12), `feat/pilot-probes` → previous branch: short probes, hints and evaluation harness.
5. [PR #13](https://github.com/Jeff15321/mathify-brief/pull/13), `feat/pilot-brief` → previous branch: four-fact tutor overview and evidence detail.
6. [PR #14](https://github.com/Jeff15321/mathify-brief/pull/14), `feat/pilot-verification` → previous branch: integrated journeys, measurement wiring and final documentation.

Review and merge in order. Each PR diff is relative to its preceding branch; the last branch contains the integrated candidate. After merging with a merge commit, retarget the next PR to main. If squashing or rebasing, first rebase the remaining branches onto the updated main so prior changes do not reappear in the next diff. Do not deploy from this stack automatically. Human study and live-model quality results remain open dependencies, not implementation tasks an agent can simulate.

## Engineering evidence and open acceptance work

Verified on 2026-11-09 with mock AI and isolated filesystem storage:

- 151 unit/component tests; typecheck and lint pass. Regression coverage includes atomic Finish,
  selected/acknowledged answer preservation, duplicate Begin/Finish, stale tabs, late generation
  after replacement/completion, schema errors, review gates, evidence summaries and draft storage.
- 16 Chromium journeys on a fresh production build, with unique test data. These cover the full
  adaptive flow, original-source imports, drawing/selection recovery, hints, phone tabs, two-photo
  and PDF-only intake, rejection of a sixth file, network retry, unavailable IndexedDB, export
  omission, lost Next response, tutor feedback and six report patterns. Actual desktop/phone
  screenshots were inspected. This is browser rendering and behavior evidence, not a human scan test.
- Offline evaluation with `--limit 24 --runs 1 --variant both` produced 48 records / 144 pairs,
  zero API calls and no plumbing failures. The synthetic set has 20 normal and 4 negative cases,
  with development/held-out splits. All participant items still require independent tutor review;
  synthetic handwriting-style images do not establish real handwriting recognition.

The source plan's partial tasks remain explicit:

- TASK-001/003: baseline refs and candidate events exist. The stakeholder deployment identity,
  frozen reviewed baseline reports and matched baseline instrumentation have not been established.
- TASK-013/020/021: automated journeys and screenshots pass. Physical camera/gallery behavior,
  Firefox/WebKit, full keyboard/screen-reader acceptance, native picker cancellation/reselection,
  delayed preparation while drawing, restart variations and long-math report acceptance still need
  targeted checks. Existing tests cover only the paths named above.
- TASK-016/017/019: the harness, prompt constraints and deterministic starting templates exist;
  live comparison and independent math-tutor ratings/adjudication remain pending. Templates are
  agent-authored drafts, not educator-approved guidance. Runtime quality review remains mandatory.
- TASK-022/023: no students or tutors were tested. The observations CSV remains header-only;
  there are no human results to summarize or improvement percentages to report.

This remains a single-process, single-workspace pilot with no authentication or session history.
Use separate instances or sequential sessions, fresh `LOCAL_DATA_DIR` storage (workspace schema 5,
brief schema 6), and synthetic problems. Historical files are preserved on schema rejection;
migration is outside this stack. Dependency tradeoffs and remaining low-severity production
audit findings are recorded in the README.

## Frozen comparison

Record commit, model ID, prompt version, mock/live/reviewed-fixture mode, device, viewport, input method and network for every run. Use synthetic problems and isolated `LOCAL_DATA_DIR` directories. Do not compare live-generated content against fixed content as an interface effect. Preserve mandatory review on both conditions. No user data in Git.

Two formative rounds of five fresh students: alternate old/new order with matched but different two-photo problems. Cue: “Use these two photos to get ready for your tutoring session.” Observe without timed think-aloud. Record all assigned trials, including errors, help and failure. Afterward ask what the checks were for. Count purpose comprehension by first exposure. Test refresh, export failure and file rejection separately. Never pool changing builds into one success rate.

Six to eight tutors: counterbalance layouts and six patterns (clear miss, simpler recovery, complete correct, all IDK, partial correct, no answers). After the page and images finish loading, allow 15 seconds, hide the report, then ask for the problem, a defensible first teaching move, one supporting observation and one evidence limit. Two math reviewers predefine acceptable answers; agreement with the app's chosen start is not required. Report per-tutor and per-case counts, not repeated cases as independent people.

## Metrics and gates

- Upload success: unassisted two-photo Begin / all assigned trials. Assisted success separately.
- Preparation time: task cue to valid Begin, including corrections. Upload/model delay separately; report failures alongside successful durations.
- First-check discoverability: independent saved response / trials with a check available. Report generation failures separately.
- Handoff: saved reports / all begun attempts, split full/partial. Early Finish can be successful.
- Tutor scan: all four facts correct after 15 seconds. Unsupported certainty is a critical error.
- Targets to investigate: 90% task/comprehension success and 30% lower preparation median. These are aspirations, not established baselines. Small formative samples cannot prove population rates.
- Any reproduced lost answer, silent lost file, false report assertion or incorrect participant item blocks the candidate pilot.

Opt-in events use `NEXT_PUBLIC_MEASUREMENT_ENABLED=true`. Export the browser's `mathify-pilot-events-v1` localStorage value using the study harness/devtools. Clear it between participants after export. No content, answer text or filenames are recorded. False return from event storage means missing telemetry; manual observation remains the source for task outcomes. Durations use a monotonic clock within a view; do not subtract clocks across browser/server or refreshed views. All missing outcomes remain unknown.

Candidate event details: `sequence` is local to `viewId`; mode/prompt may be `unknown` before
loading a workspace. `probe_ready` means the current question is available in client state;
`probe_visible` requires a visible document and at least 10% of its card intersecting the viewport.
Neither event proves attention or comprehension. Refresh can emit another ready/visible event;
deduplicate outcomes by attempt/probe and use only same-view segments for client timing.
`answer_saved` requires a server acknowledgement, so a lost response can leave a saved answer
without an event. Reconcile reports or mark missing telemetry; do not infer an unanswered item.
`brief_visible` waits for current images and fonts as well as a visible document; failed image
decoding leaves visibility unrecorded. Successful server preparation time includes source loading,
generation and review; failed-call durations and deferred-pair durations are available only in
the evaluation harness, not the browser sink. Repeat `analysis_started` events count requests,
not billable AI calls. File rejection has an event but no content/reason text. At 10,000 events
the sink stops appending instead of dropping early denominators; check/export between sessions.

Store raw observations outside Git under ignored `artifacts/pilot/`. The results CSV in this directory starts with headers only. Report counts and conditions, uncertainty and observed failures before making any improvement claim.
