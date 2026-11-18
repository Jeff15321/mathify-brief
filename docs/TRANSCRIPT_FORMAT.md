# Transcript format

Session transcripts are plain UTF-8 text. The format is our own and intentionally lenient: it is easy to export from a tutoring call, easy to type by hand, and still readable when parts of it are missing.

## Structure

1. **Header (optional).** `Key: value` lines at the top of the file. Recognised keys are `Session`, `Date` (`YYYY-MM-DD`), `Tutor` and `Student`; unknown keys are kept as plain text.
2. **One blank line** separates the header from the turns.
3. **Turns.** One turn per line: `[HH:MM:SS] Speaker: text`. The timestamp is elapsed time since the session started. Speakers are usually `Tutor` and `Student`, but any name is accepted.

```
Session: Linear equations review
Date: 2026-10-03
Tutor: Ms. Patel
Student: Demo Student

[00:00:05] Tutor: Let's start with 2(x + 3) = 14.
[00:00:12] Student: So it's 2x plus 3?
```

Math is written inline as plain text (`2(x + 3) = 14`, `x^2`, `3/4`). Whiteboard images are uploaded separately and are not referenced from the transcript.

## Leniency

- Unlabelled text (no timestamp, no speaker, or neither) is still a valid transcript. The summarizer is told that timestamps and speaker labels may be missing and must infer who is speaking from context.
- A turn may wrap onto following lines; lines without a `[HH:MM:SS]` prefix continue the previous turn.
- The header can be omitted entirely; the session date is chosen at upload and stays editable.

## Accepted files

`.txt`, `.md`, `.vtt` and `.srt`. Captions files (`.vtt`, `.srt`) are read as text as-is; cue numbers and `-->` timing lines are treated as unlabelled text.

Sample transcripts that follow this format live in [`samples/sessions/`](../samples/sessions/README.md).
