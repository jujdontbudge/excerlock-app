# Condition demo prototype

Interactive HTML prototype of a new onboarding step, "How your plan works", that follows the plan summary (S3) and animates every shipped condition. Captain-approved 2026-09-19. Not production code: `app-next/` is untouched.

- Open `index.html` in a browser (no server needed). Primary viewport is iPhone geometry (402×874); the review rail on the right selects the condition, values, playback and shield copy.
- `assets/frames/` and `assets/frames-free/`: GPT Image Sunburst character frames (provenance and verbatim prompts in `gen/PROVENANCE.md`; the raw 2048² sheets are not committed and regenerate with the commands recorded there).
- `screenshots/capture.sh`: produces one PNG per scenario phase into `screenshots/` (ignored; run from the repo root with `chrome-devtools-axi` installed).
- `IMPLEMENTATION-PROMPT.md`: the handoff spec for building this step in `app-next` (hierarchy, geometry, phases and timing, walking-cycle rules, hold gesture, accessibility, condition semantics).
- `window.demo` (`select`, `set`, `jump`, `pause`, `play`, `hold`, `release`, `tick`, `state`) drives the prototype from a harness.
