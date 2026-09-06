> Superseded process status: see [STATUS.md](STATUS.md). Johan authorized proceeding through T16 with available references and deferred Gemini work. Historical blockers below are preserved for provenance.

# Reference study (T00, blocked)

Raw observations of OtterLife, AppBlock and Unrot. Gemini observes; Codex owns ExcerLock layout and animation design. This folder contains no approved ExcerLock implementation specification.

- `PROMPTS.md` records the initial invocation; `raw/*.prompt.txt` records each subsequent exact prompt.
- `raw/*.md` preserves stdout from `agy` with `gemini-3.7-flash-high`; accompanying logs preserve stderr. Partial progress reports are not accepted observations.
- `run-study.py` runs one clip per CLI invocation with the prescribed model and permission flags. It redirects stdout to files, never pipes it.
- Source videos and 180-second hardware-encoded segments live in `design/research/{otter,appblock,unrot}-replay/` and are ignored by git. Download provenance is beside each fetched replay.
- `strips/` will contain actual extracted source frames, never generated reconstructions.
- `extract-frames.py` creates frames/strips from completed JSON timestamp indexes; `check-study.py` fails until every required segment and aggregate file exists.
- `QUALITY-NOTES.md` records rejected observation claims; `RESUME.md` records blockers and the exact continuation path.

## Acceptance status

Blocked by the prescribed Gemini model's individual quota (reported reset around 21:10 UTC on 2026-09-06). All three source recordings are available. Inventories, motion measurements, frame strips, Settings coverage and numeric validation must pass before T00 can be committed as complete. Expo MCP authentication is now resolved: OAuth login succeeded and a documentation search returned successfully in this session. No Phase 1 task has been accepted or committed.
