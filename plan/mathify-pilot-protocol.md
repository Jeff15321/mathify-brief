# Mathify pilot protocol

Implementation baseline: `b1c8e0a` (main refreshed 2026-11-09). Research baseline: `9704035`; newer demo comparison: `3c89a30`. Confirm which deployed build received the stakeholder feedback before attributing improvements to that experience. Current main includes mandatory AI quality review and persistent tutor feedback; preserve both.

## PR sequence

1. `feat/pilot-baseline` → main: plan, protocol, opt-in local measurement.
2. `feat/pilot-integrity` → previous branch: workspace identity, safe finalization and honest evidence.
3. `feat/pilot-workspace` → previous branch: one workspace, batch uploads, preparation, whiteboard and recovery.
4. `feat/pilot-probes` → previous branch: short probes, hints and evaluation harness.
5. `feat/pilot-brief` → previous branch: four-fact tutor overview and evidence detail.
6. `feat/pilot-verification` → previous branch: integrated journeys, measurement wiring and final documentation.

Review and merge in order. After each merge, retarget the next PR to main. Do not deploy from this stack automatically. Human study and live-model quality results remain open dependencies, not implementation tasks an agent can simulate.

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

Store raw observations outside Git under ignored `artifacts/pilot/`. The results CSV in this directory starts with headers only. Report counts and conditions, uncertainty and observed failures before making any improvement claim.
