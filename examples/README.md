# Make your own mock data

This folder is a self-contained Grade 9 algebra story you can load with no API key. Mock mode (`AI_MOCK_MODE=true`, the default) never calls Claude. It fills the learner profile from the session title in the transcript, then a later Tutor Brief can cite that profile.

Use a fresh data folder so you do not overwrite someone else's saved workspace and so an older `./data` file does not block you.

## 1. Start the app

```bash
npm install
cp .env.example .env.local
```

In `.env.local`:

```bash
AI_MOCK_MODE=true
LOCAL_DATA_DIR=./data-mine
```

Leave `ANTHROPIC_API_KEY` empty. Then:

```bash
npm run dev
```

Open http://localhost:3000. If the page says the saved workspace uses an older format, the server is still reading an old folder. Point `LOCAL_DATA_DIR` at a new empty directory and start `npm run dev` again.

## 2. What you should see

Upload the four transcripts below in date order. After each upload the profile rebuilds on its own. You do not need a Rebuild button.

| Session title in the file | Upload date | What mock mode records |
| --- | --- | --- |
| Multi-step linear equations | 2026-09-26 | Struggle: multiplied only the first term inside brackets. Strength: one-step equations were quick and correct. |
| Linear equations review | 2026-10-03 | The same bracket struggle again, plus a sign that did not flip when a term moved across `=`. |
| Area models for expanding brackets | 2026-10-17 | What works: an area-model drawing. Habit: skips substitution checks unless asked. |
| Equations with fractions and word problems | 2026-11-07 | The same area-model note and the same check habit. |

The profile groups identical notes. The bracket struggle cites Sep 26 and Oct 3 only. The area-model note and the check habit cite Oct 17 and Nov 7 only. Nothing cites all four dates. Next session focus becomes "Revisit: Multiplied only the first term inside brackets."

## 3. Load the sessions

Go to **Sessions** and choose **Add session**. For each row, set **Session date** to the date in the table. The date in the form is the one the profile uses. The `Date:` line inside the file is only a label.

| Date to type | Transcript | Whiteboard images, if any |
| --- | --- | --- |
| 2026-09-26 | `transcripts/2026-09-26-multi-step-equations.txt` | none |
| 2026-10-03 | `transcripts/2026-10-03-linear-equations-review.txt` | none |
| 2026-10-17 | `transcripts/2026-10-17-area-models.txt` | both `session-whiteboards/2026-10-17-whiteboard-area-model-4-x-plus-5.png` and `session-whiteboards/2026-10-17-whiteboard-area-model-3-x-plus-7.png` |
| 2026-11-07 | `transcripts/2026-11-07-fractions-and-word-problems.txt` | `session-whiteboards/2026-11-07-whiteboard-area-model-2-2w-plus-4.png` |

Wait until the session card says **Ready** before you upload the next one. Then open **Learner profile** and check the four sections: Struggles, Strengths, What works when teaching, and Habits.

## 4. Generate a Tutor Brief

On **Workspace**, either type a question or upload one picture from `problems/`:

| File | Question, also listed in `problems/questions.txt` |
| --- | --- |
| `problems/01-brackets.png` | Solve 2(x + 3) = 14. |
| `problems/02-moving-terms.png` | Solve 5x + 4 = 2x + 13. |
| `problems/03-rectangle.png` | A rectangle's length is 4 cm more than its width. The perimeter is 48 cm. Find the dimensions. |

Choose **Let's begin**, answer the checks, and send the report. It stays on Workspace.

Mock mode does not read your question and invent new checks. It always prepares the same three linear-equation checks, so the picture is there for the demo layout, not because the checks change. **Relevant from past sessions** then quotes the first three profile notes, with dates on their own line, for example "Worth revisiting: Multiplied only the first term inside brackets" and "Sep 26 and Oct 3".

**New question**, beside the report title, starts another attempt. The sessions and the profile stay.

## 5. Write your own transcript

A transcript is plain text. Full rules are in [docs/TRANSCRIPT_FORMAT.md](../docs/TRANSCRIPT_FORMAT.md). A short session looks like this:

```text
Session: Solving one-step equations
Date: 2026-11-01
Tutor: Ms. Patel
Student: Demo Student

[00:00:10] Tutor: Solve x + 5 = 12.
[00:00:22] Student: I took away 5 from both sides. x is 7.
[00:00:31] Tutor: Check it in the original equation.
[00:00:40] Student: Do we have to? 7 plus 5 is 12.
```

`Session:` must be the first header line of that kind. Mock mode looks up that exact title:

- `Multi-step linear equations`
- `Linear equations review`
- `Area models for expanding brackets`
- `Equations with fractions and word problems`

Any other title still uploads, but the summary is generic and the profile gets one habit: "Needs a prompt before checking an answer." Repeating that same sentence on every custom session makes the profile cite every one of those sessions. That is why the shipped story reuses a sentence on purpose, and only across two dates.

To have Claude read a transcript you wrote, set `AI_MOCK_MODE=false`, add `ANTHROPIC_API_KEY` to `.env.local`, and restart `npm run dev`. Session summaries and the profile use `ANTHROPIC_SUMMARY_MODEL`. Each new question also calls the main model. Do not commit `.env.local`.

## 6. Keep it local

`LOCAL_DATA_DIR` is your machine's saved workspace, sessions, and profile. Do not commit that folder. Share transcripts and images from this `examples/` folder instead.
