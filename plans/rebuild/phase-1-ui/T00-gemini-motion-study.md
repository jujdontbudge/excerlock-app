# T00 — Gemini motion and layout study → `design/motion/`

Goal: a written bible that tells Codex, per screen, how OtterLife lays things out and how OtterLife, AppBlock
and Unrot animate, in words and numbers, so that every animation in ExcerLock is built from it and later
graded against it. Gemini writes it; Codex runs Gemini and files the output. This task has no app code.

## Prerequisites (blocking; see `00-decisions.md` §E1–E3)

1. **Gemini auth.** `gemini --version` is 0.35.1. Its configured auth (`~/.gemini/settings.json`,
   `security.auth.selectedType: "oauth-personal"`) fails with `IneligibleTierError` (Google retired that tier
   for this client). Johan must provide an AI Studio key: `echo 'GEMINI_API_KEY=...' >> ~/.gemini/.env` (or
   export it), then `gemini -p "say ok"` must answer. Codex does not proceed until it does. Do not paste keys
   into the repo.
2. **Recordings.** Present: `design/research/otter-replay/replay.mp4` (OtterLife, 25 min, 74 MB, full
   product replay; only 139–171 s was ever reviewed). Missing: AppBlock and Unrot replays. Obtain them:
   - Preferred: ScreensDesign MCP. Add to this repo's `.mcp.json`:
     `{"mcpServers":{"screensdesign":{"type":"http","url":"https://api.screensdesign.com/v1/mcp"}}}` (it is
     already configured for the `reform` project). AppBlock is app 1901, replay `av=3371`; OtterLife is app
     2235, replay `av=2937`; find Unrot's app and replay ids by searching the MCP. Download the replay MP4s to
     `design/research/appblock-replay/replay.mp4` and `design/research/unrot-replay/replay.mp4`, and record
     provenance in a `FOUNDRY.md` next to each (source URL, date, duration).
   - Fallback: ask Johan to screen-record each app on his phone (full onboarding, then every main tab, every
     settings row, one sheet open/close, one tab switch, slow deliberate taps) and drop the files there.

## Inputs Gemini gets

- The three replay videos (clipped, see below) and the per-app onboarding screenshot folders
  (`design/research/competitor-onboarding/fitness/03-otterlife`, `screen-time/02-appblock`,
  `fitness-lock/02-unrot`) with their `screens.tsv` timestamps (dwell-time data). The screenshot PNGs are
  gitignored (196 MB, refetchable): if the folders are empty, run
  `bash design/research/competitor-onboarding/download-screens.sh` and
  `bash design/research/competitor-onboarding/fitness-lock/download-screens.sh` first.
- `plans/rebuild/02-screen-inventory.md` (our screen ids) and `03-design-system.md` (our tokens) so the
  mapping is expressed in our vocabulary.
- The 17 v3 mockups in `design/mockups/onboarding-orange/` and the four `main-*-v3.png` screens, as the
  visual target the motion must serve.

## Method

1. **Clip the videos.** Gemini CLI attaches files inline; a 74 MB file may exceed the request limit. Split
   each replay into ≤ 3-minute, ≤ 20 MB segments with the hardware encoder (there is no `libx264` in this
   ffmpeg build):
   `ffmpeg -ss <start> -t 180 -i replay.mp4 -vf scale=540:-2 -an -c:v h264_videotoolbox -b:v 1200k seg-NN.mp4`.
   Keep a `segments.md` index (start time → what is on screen) next to the clips. If a clip still fails to
   attach, use the Gemini API's file upload (`@google/genai`, `ai.files.upload`, then reference the file in
   `generateContent`) from a small Node script in `tools/gemini-video/`; verify the current API shape in the
   official docs before writing it, and commit the script with a README.
2. **Pass A — inventory (per app).** For each segment: list every screen shown, in order, with timestamps;
   for each screen: layout regions top to bottom (header, hero, content, footer), component types, what is
   fixed vs scrolls, tab bar presence. Output `design/motion/inventory-<app>.md`.
3. **Pass B — motion (per app).** For each transition and micro-interaction in each segment: what moves
   (elements), the property (translate/scale/opacity/color/number), direction, estimated duration in ms,
   easing character (linear / ease-out / spring with visible overshoot or not), stagger between siblings,
   whether the interaction is gesture-driven (drag, swipe) or tap-driven, and any visible haptic cue (screen
   flash, tick). Output `design/motion/motion-<app>.md`. Numbers must be estimates from frame counts at the
   video's fps; say the fps used.
4. **Pass C — the ExcerLock bible.** One file per ExcerLock flow, in our screen ids:
   `design/motion/00-principles.md` (shared rules: durations, curves, stagger, what never animates),
   `10-onboarding.md`, `20-setup.md`, `30-home.md`, `40-conditions.md`, `50-analytics.md`, `60-settings.md`,
   `70-sheets-and-paywall.md`. For every screen id: (a) **OtterLife layout mapping** — which OtterLife screen
   it corresponds to and the component order to copy (for Settings: the exact row grouping and order OtterLife
   uses, then where each of our required rows goes, and what each of our rows that OtterLife lacks is modeled
   on); (b) **enter transition**, (c) **exit transition**, (d) **micro-interactions** (press, select, toggle,
   number ticks, progress fills), (e) **timing table** (ms, curve name from our motion tokens or a new named
   curve with its cubic-bezier or spring parameters), (f) **haptic**, (g) **Reduce Motion fallback**, and
   (h) a **review checklist** of 3–8 observable items a grader can verify from a screen recording.
   Where AppBlock is the reference (app picker, schedule editor, blocking status), say so explicitly.
5. **Pass D — self-check.** Ask Gemini to re-read the bible against `03-design-system.md` and flag any effect
   that Reanimated 4 + Gesture Handler + SVG cannot produce. Those items go into
   `design/motion/90-out-of-floor.md` for Johan (decision C5). Nothing else may reference Skia/Rive/Lottie.

Prompts are saved verbatim in `design/motion/PROMPTS.md` with the model name and date. Gemini's raw outputs
are saved under `design/motion/raw/` before any editing; the bible files are the edited, de-duplicated result.

## Acceptance

- [ ] `design/motion/` contains `00-principles.md`, the seven flow files, the three inventories, the three
      motion files, `90-out-of-floor.md`, `PROMPTS.md`, `raw/`, and a `README.md` explaining how to regrade.
- [ ] Every screen id in `02-screen-inventory.md` §2–§7 appears in exactly one flow file with items (a)–(h).
- [ ] Settings mapping lists OtterLife's real settings rows in order (from the replay, not memory) and
      places all of our required rows.
- [ ] No asset copying: the bible describes behavior, never "use OtterLife's image".
- [ ] `90-out-of-floor.md` is empty or has been shown to Johan.
