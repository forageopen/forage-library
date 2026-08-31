---
name: transcript-cleaner
description: >
  Deploy this skill whenever the user uploads or pastes a video or audio transcript and wants to extract clean, verbatim quotes from one or more speakers. Trigger on phrases like "clean this transcript", "extract quotes from", "isolate what X said", "strip the host commentary", "get Jensen's statements", "clean this interview", "clean this keynote", "clean this panel", or any request where the source is a transcript and the goal is a clean speaker-only quote document. Also trigger when the user uploads a .txt file that appears to be an auto-generated or NoteGPT-style transcript. Output is always a .md file written via filesystem:write_file. Never paraphrase, summarize, or interpret — verbatim extraction only.
---

# Transcript Cleaner

Extracts clean, verbatim quotes from a video or audio transcript. No paraphrasing. No summaries. No interpretation. Exact words of the target speaker(s) only.

---

## What This Skill Does

- Identifies whether the transcript is a **solo** speaker (keynote, lecture, monologue) or a **panel** (interview, roundtable, multiple hosts)
- For panels: strips all non-primary speaker turns, retaining only the target speaker
- Removes filler words (`uh`, `um`, `you know`, `like`, `I mean` as standalone fillers)
- Removes false starts and repeated half-sentences
- Applies light punctuation corrections only — no word changes, no rewording, no added meaning
- Groups output by chapter (if transcript has timestamps/chapters) or by theme (identified by Claude from content)
- Outputs a single `.md` file, UTF-8 encoded, written via `filesystem:write_file`

---

## Auto-Detection Rules

### Solo vs. Panel

Read the transcript first. Determine format from these signals:

| Signal | Format |
|---|---|
| `>>` turn markers present | Panel |
| Multiple named speakers in turns | Panel |
| Single continuous voice, no turn markers | Solo (keynote / lecture) |
| NoteGPT-style with only timestamps, no `>>` | Likely solo — confirm from content |

### Timestamp Handling

- If timestamps are present in the source transcript → include one timestamp per quote block (at the start of the speaker's turn)
- If timestamps are absent → skip silently, do not note their absence, do not ask

---

## What to Ask — Minimal, Front-Loaded

Before starting, ask only what cannot be inferred:

### For Panel Transcripts

Ask both questions in one message:

1. **Primary speaker** — if the target speaker is not clearly identified in the file name or transcript header, ask: *"Who is the primary speaker to extract?"*
2. **Structure** — always ask: *"How should the output be grouped — follow the original chapter/topic order, or regroup under themes I identify from the content?"*

### For Solo Transcripts (Keynote / Lecture)

Ask only:

1. **Structure** — *"How should the output be grouped — follow the original chapter/topic order, or regroup under themes I identify from the content?"*

### Never Ask About

- File format (always `.md`)
- Filler removal (always on)
- False start removal (always on)
- Punctuation style (always light correction only)
- Timestamps (include if present, skip if absent — no question)
- Summary or interpretation (never included — no question)

---

## Output Specification

### File Header (always first)

```
# [Video/Transcript Title]
**Source:** [Source label — e.g. "GTC 2026 Keynote" or "All-In Interview (Panel)"]
**Format:** [Speaker name]'s statements only · Grouped by [chapter / theme] · Filler words removed · False starts cleaned · Light punctuation only — no wording altered
**Exclusions:** [List any excluded segments, e.g. "Pre-recorded opening narration · Spec listing passages" — omit this line if nothing excluded]
```

The video/transcript title is extracted from:
1. The uploaded filename (strip underscores, clean formatting)
2. Or the first heading/title line inside the transcript
3. If neither is available, ask the user

### Body Structure

```
## [Section Title]

**[HH:MM:SS]**
[Clean quote — paragraph form, no bullets]

**[HH:MM:SS]**
[Clean quote]
```

- Section titles: use chapter names from the transcript if available; otherwise derive from thematic content
- If no timestamps in source: omit the timestamp line entirely, go straight to the quote
- Each quote block = one continuous speaker turn (multiple timestamp segments merged if the speaker continues uninterrupted across a timestamp break)

### What a Quote Block Includes

- The speaker's exact words
- Filler words removed (`uh`, `um`, `you know`, `like` as standalone pause-fillers)
- False starts removed (e.g. `"It it it the the thing is"` → `"The thing is"`)
- Repeated half-sentences collapsed to the complete version
- Light punctuation added for readability (commas, em dashes, sentence breaks) — no words changed or added
- Mid-quote host affirmations stripped from panel transcripts (e.g. `>> Right. >> Yeah.` inserted within a speaker's turn — remove)

### What a Quote Block Never Includes

- Paraphrase or rewording
- Summary lines
- Interpreter's notes or context-setting
- `[laughs]`, `[applause]` or other stage directions unless they are spoken words
- Any sentence that was said by a non-primary speaker

---

## Panel-Specific Rules

Transcripts with `>>` turn markers:

- `>>` marks a speaker turn boundary
- Attribute turns by position and context — if speaker names are not labelled, infer from content continuity (the primary speaker is typically the one giving substantive answers; hosts typically ask questions or give short affirmations)
- When boundary is ambiguous, **default to exclusion** — do not include a turn unless confident it belongs to the primary speaker
- Strip host affirmations embedded mid-speaker-turn (e.g. `>> Right. >> Exactly.` inserted inside the primary speaker's paragraph)

---

## File Write Rule

**Always write output using `filesystem:write_file`.**

Never use:
- PowerShell `Set-Content` without explicit `-Encoding UTF8`
- Windows-MCP FileSystem write for transcript output files
- Any method that does not guarantee UTF-8 encoding

This prevents corruption of em dashes, Unicode characters, and multi-byte characters in the output file.

If the user specifies a destination path (e.g. *"save it to my Forage vault Reference folder"*), write directly there. If no path is given, write to `/mnt/user-data/outputs/[cleaned-title].md` and present via `present_files`.

---

## Failure Mode to Avoid

**Encoding errors** — garbled characters, broken em dashes, corrupted Unicode — are a hard failure. Always use `filesystem:write_file`. If in doubt, verify the write path is accessible before writing.

---

## Quality Check Before Writing

Before writing the output file, confirm internally:

- [ ] No host/non-primary speaker lines included
- [ ] No paraphrasing — every word in every quote came from the source
- [ ] No summary or interpretation added anywhere
- [ ] Video title is present as H1
- [ ] Structure (chapters or themes) matches what the user selected
- [ ] Timestamps included only if present in source
- [ ] File write method is `filesystem:write_file`
