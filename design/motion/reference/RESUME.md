> Superseded process status: see [STATUS.md](STATUS.md). Johan authorized proceeding through T16 with available references and deferred Gemini work. Historical blockers below are preserved for provenance.

# Phase 1 resume — blocked during T00

Branch: `rebuild/phase-1`, created from `wip/pre-rebuild-snapshot-2026-09-06` at `91c1d9ee83eb832526165685ea5536ca823f9821`. No task has been accepted or committed. T01–T16 have not started. Do not mistake raw drafts or extracted images for a passed T00.

## External blockers

1. `agy` reported **Individual quota reached** on 2026-09-06 around 18:19 UTC, with a reset in approximately 2h51m (about 21:10 UTC / 4:10 PM America/Chicago). See `raw/appblock-00.err.log` and `raw/otter-01-errata.err.log`. Do not switch the prescribed model or silently bypass the Gemini gate.
2. **Resolved:** Expo MCP authenticated through `codex mcp login expo` as `johansardar`. Tools loaded in this session and `mcp__expo__search_documentation` successfully returned official Expo documentation. No restart is required for this session. No Expo CLI scaffolding or dependency changes have been attempted.

## Available sources

- OtterLife: original 1515.886 s / 30 fps recording; 9 encoded segments.
- AppBlock: replay 3371, 663.581 s / 30 fps; downloaded from the observed ScreensDesign player; 4 encoded segments.
- Unrot: app 2334, replay 3251, 319.112 s / 30 fps; downloaded from the observed ScreensDesign player; 2 encoded segments.
- Source recordings and clips are gitignored. AppBlock/Unrot `FOUNDRY.md` files and all `segments/segments.md` files preserve provenance and timing.
- The pre-existing competitor screenshot folders are populated. No refetch is needed.

## Quality issue that must remain visible

The original OtterLife 00/01 and Unrot 00 calls used OCR and fabricated some visual details and motion arrays. The source strips exposed the errors. Gemini's explicit image-only smoke check works. `raw/otterlife-00-errata.md` retracts the unsupported arrays, corrects layout/color/copy errors, and provides coordinates for four representative motions. Read `QUALITY-NOTES.md` before using any raw draft.

The Unrot 00 errata and OtterLife 08 calls exited with only progress messages, despite exit code 0. They are incomplete. OtterLife 01 errata failed at quota. None should count as passed merely because a command exited 0.

## Continue after quota reset

1. Run `python3 design/motion/reference/check-study.py` for the exact missing observations/frames. It deliberately fails while incomplete.
2. Finish OtterLife segments 04–08 and AppBlock segments 00–03 using `run-study.py`. The script skips complete JSON indexes and archives incomplete prior attempts; still review completeness and accuracy yourself. Run one video per agy call with the required flags. Prioritize the actual Settings coverage in OtterLife 08 and the AppBlock blocking flows.
3. Finish the correction passes for OtterLife 01 and Unrot 00. Exact errata prompts are in `raw/*.prompt.txt`. Explicit image viewing is required; never accept OCR-only visual claims, synthesized displacement arrays, or supposed native framework internals inferred from pixels.
4. Extract source frames using `extract-frames.py raw/<segment>.md`. Inspect them, correct inaccurate timestamps/observations, and produce complete inventories/motion files. Preserve raw outputs and errata. Do not merge known false claims into authoritative reference files.
5. Finish the prompts index, screen contact sheets, every listed motion strip, Settings coverage check and T00 README. Only then commit T00 as the single task commit.
6. Expo MCP is now callable; start T01 after T00 passes. Follow the remaining tasks strictly, including T05b after T09 and the M1 Gemini/user review.

No simulator was created or booted for this task. The existing `persona-Recovi-Checkout` simulator belongs to other work and was left untouched. No changes were made to `app/`, `server/`, `packages/`, or `excer-ui-mock/`.
