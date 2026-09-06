# T00 — Gemini reference study of OtterLife, AppBlock and Unrot → `design/motion/reference/`

Goal: raw, frame-accurate observations of how the three reference apps lay out their screens and animate,
written by Gemini from the recordings. That is all Gemini does. **Codex decides how ExcerLock maps to those
apps and how every ExcerLock screen animates**, using these observations plus its own judgment. This task
has no app code.

## Prerequisites

1. **Use `agy`, not `gemini`.** The old `gemini` binary (0.35.1) is retired by Google and fails with
   `IneligibleTierError`. Johan's subscription runs through the Antigravity CLI: `agy --version` → 1.1.27
   (`~/.local/bin/agy`). Verified command shape (2026-09-06, on a 20-second clip and on a 3-minute 25 MB
   segment, both returned per-frame displacement curves and full screen inventories):

   ```sh
   agy -p "Watch the whole app screen recording at /abs/path/clip.mp4, every frame. <task>" \
       --model gemini-3.7-flash-high --dangerously-skip-permissions --add-dir /abs/path/dir \
       > out.md 2> err.log
   ```

   Rules: write the absolute file path inside the prompt (no `@file` syntax); pass the containing directory
   with `--add-dir`; always redirect stdout to a file (piping through `tail`/`time` killed one run with exit
   144); one video per call. Codex checks `agy -p "say ok" --model gemini-3.7-flash-high
   --dangerously-skip-permissions` before starting.
2. **Recordings.** Present: `design/research/otter-replay/replay.mp4` (OtterLife, 25 min, full product
   replay). Missing: AppBlock and Unrot replays. Obtain them:
   - Preferred: ScreensDesign MCP. Add to this repo's `.mcp.json`:
     `{"mcpServers":{"screensdesign":{"type":"http","url":"https://api.screensdesign.com/v1/mcp"}}}` (it is
     already configured for the `reform` project). AppBlock is app 1901, replay `av=3371`; OtterLife is app
     2235, replay `av=2937`; find Unrot's ids by searching the MCP. Download the replay MP4s to
     `design/research/appblock-replay/replay.mp4` and `design/research/unrot-replay/replay.mp4` (gitignored),
     and record provenance in a `FOUNDRY.md` next to each (source URL, date, duration).
   - Fallback: ask Johan to screen-record each app on his phone (full onboarding, then every main tab, every
     settings row, one sheet open/close, one tab switch, slow deliberate taps) and drop the files there.
3. The per-app onboarding screenshot folders (`design/research/competitor-onboarding/fitness/03-otterlife`,
   `screen-time/02-appblock`, `fitness-lock/02-unrot`) with their `screens.tsv` timestamps are extra input.
   The PNGs are gitignored (196 MB, refetchable): if a folder is empty, run
   `bash design/research/competitor-onboarding/download-screens.sh` and
   `bash design/research/competitor-onboarding/fitness-lock/download-screens.sh` first.

## Method

1. **Clip the videos.** Split each replay into 3-minute segments with the hardware encoder (there is no
   `libx264` in this ffmpeg build):
   `ffmpeg -ss <start> -t 180 -i replay.mp4 -vf scale=540:-2 -an -c:v h264_videotoolbox -b:v 1200k seg-NN.mp4`.
   Keep a `segments.md` index (start time → what is on screen) next to the clips under
   `design/research/<app>-replay/segments/` (clips gitignored, index committed).
2. **Inventory pass, per app, per segment.** Every screen shown, in order, with timestamps; for each screen:
   layout regions top to bottom (header, hero, content, footer), component types, what is fixed vs scrolls,
   tab bar presence. Merge segments into `design/motion/reference/inventory-<app>.md`. For OtterLife make
   sure the main tabs and the full Settings screen (every row, in order, with grouping) are covered; if the
   replay never scrolls Settings fully, say so and ask Johan for a recording of it.
3. **Motion pass, per app, per segment.** Every transition and micro-interaction: what moves (elements), the
   property (translate/scale/opacity/color/number), direction, duration in ms from frame counts (state the
   fps), easing character (linear / ease-out / spring with or without overshoot, with per-frame displacement
   where visible), stagger between siblings, gesture-driven vs tap-driven, visible haptic cues. Merge into
   `design/motion/reference/motion-<app>.md`.
4. **Frame strips for Codex.** Codex cannot watch video but can view images. For every transition and
   micro-interaction Gemini lists with a timestamp, cut a horizontal strip of frames around it:
   `ffmpeg -ss <t-0.2> -t 1.2 -i seg.mp4 -vf "fps=12,scale=200:-2,tile=15x1" strips/<app>-<id>.png`
   (one strip per moment, 15 frames at 12 fps, named by app and the motion id from the motion file). Also
   one contact sheet per screen for layout (`design/motion/reference/strips/<app>-screens.png`). Commit the
   strips (small PNGs); they are what Codex looks at while building.
5. Save prompts verbatim in `design/motion/reference/PROMPTS.md` with model and date; raw outputs under
   `design/motion/reference/raw/` before merging.

That is the whole task. No ExcerLock mapping, no per-screen spec, no checklist: Codex does that while
building each screen, and records what it took from the references in each task's motion notes
(`app-next/evidence/<task>/motion-notes.md`).

## Acceptance

- [ ] `design/motion/reference/` contains the three inventories, the three motion files, `PROMPTS.md`,
      `raw/`, and a `README.md` that says what each file is and how it was produced.
- [ ] OtterLife inventory covers onboarding, the trial/paywall sequence, every main tab and the whole Settings
      screen; AppBlock inventory covers the app picker, schedule editor and blocking status screens.
- [ ] Motion files give numbers (ms, fps, per-frame displacement where visible), not adjectives.
- [ ] `strips/` has one frame strip per listed motion and one contact sheet per screen, for all three apps.
