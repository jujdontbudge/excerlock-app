# ExcerLock Dashboard Prototype — Codex Build Spec

You (Codex) are building a **functioning UI prototype** of the ExcerLock dashboard.
Copy the supplied mockup **exactly**. Every visible control must be a real, pressable
button with press feedback. Buttons may navigate to blank placeholder screens —
navigation destinations do not matter. What matters is: pixel-faithful visuals,
real touchable components, and the completion animation implemented precisely as
specified in section 5.

## 0. Ground-truth assets (read these first)

| File | Role |
|---|---|
| `design/mockups/nosparkle-v14-best.png` | THE ground truth. 1179×2676 still of the finished dashboard. Copy it exactly. |
| `design/mockups/unlock-animation-v15-iphone.mp4` | Completion animation reference (~5 s). Watch it / extract frames with ffmpeg. |
| `design/mockups/unlocked-v15-nanobanana.png` | End-state still: how the screen looks AFTER the animation (shackle open, "✓ Completed"). |

Two things in these references are **artifacts — do NOT build them**:

1. The dark **"Pillow — curated by Mobbin" footer bar** at the very bottom of the
   still and video. It is a watermark from a design-reference source. Replace it
   with nothing: the gradient runs to the bottom edge with a standard white home
   indicator.
2. A **desktop mouse cursor** appears in the video around the tap (~1–2 s). There
   is no cursor in the app; the tap is a normal touch.

## 1. Stack & project setup

- **Expo + React Native (TypeScript), running as EXPO WEB in the browser.**
  Create the app at `prototype/` inside this repo. **Do NOT use the iOS
  simulator anywhere in this task** — develop, run, and verify entirely via
  `npx expo start --web` (react-native-web) opened in Chrome. Install
  `react-dom`, `react-native-web`, and `@expo/metro-runtime` so web works.
- **iPhone dimensions on the web page (critical):** the entire app renders
  inside a fixed **393 × 852** wrapper (an "iPhone frame" View with
  `width: 393, height: 852, overflow: 'hidden'`), centered horizontally and
  vertically on a neutral near-black page background (`#111`), with rounded
  corners (~44) so it reads as a phone screen. All pt coordinates in this spec
  map 1:1 to CSS px inside that frame. Never let the UI stretch to the browser
  window; the frame is the screen.
- Use `expo-router` or a minimal stack navigator — either is fine; destinations
  are blank screens (verify your choice works on web).
- Animation: **react-native-reanimated** (springs) — include its babel plugin;
  it works on web. **expo-haptics** calls must be guarded with
  `Platform.OS !== 'web'` (they no-op/throw on web).
- Confetti: use a **default off-the-shelf confetti library** that works with
  react-native-web (`react-native-confetti-cannon` does; a DOM lib like
  `canvas-confetti` behind a small wrapper is also acceptable). Do not
  hand-build confetti; stock behavior tuned to the colors in §5 is exactly what
  is wanted.
- All coordinates below are in pt for a 393×852 pt screen (the mockup is that
  screen at 3×). Inside the fixed frame, pt = px exactly.
- **Use the expo MCP server** (already configured in your environment) —
  `read_documentation` / `learn` / `add_library` — whenever you're unsure about
  Expo web setup, a library's web compatibility, or install commands. Prefer it
  over guessing.

## 2. Screen spec (top → bottom)

Everything sits on one full-bleed vertical gradient. No scroll — the whole
dashboard fits one viewport.

**Background gradient** (sampled from the mockup):
`#F98529` (0%) → `#F97A22` (15%) → `#F76D1C` (30%) → `#F45C11` (44%) →
`#F44D09` (60%) → `#F04205` (72%) → `#EB2E02` (100%). Implement with
`expo-linear-gradient` using these stops.

1. **Status bar** — since this runs on web inside the frame, there is no real
   iOS status bar: render a mock one at the top of the frame matching the
   mockup — `9.41` left (17 pt semibold white, ~28 pt inset), and white
   signal-bars / wifi / battery glyphs right-aligned. Simple Views/SVG or tiny
   foundry PNGs — whichever matches the mockup best.

2. **Goal progress bar** — y ≈ 84 pt center. Track: full width minus 22 pt side
   margins, ~12 pt tall, fully rounded. Left 50% = solid white `#FDFCFC`; right
   50% = translucent white (white at ~45% opacity over the gradient). **Thumb**:
   a 26 pt solid-white circle centered exactly at the 50% point, vertically
   centered on the track, soft drop shadow, containing a tiny dark padlock glyph
   (~12 pt, asset `icon-padlock-mini.png`). The thumb is a Pressable (no-op).
   - Caption ~26 pt below the bar, centered: `50% of goal completed` — white,
     15 pt regular.

3. **Hero lock** — centered horizontally, spanning roughly y 170→360 pt; body
   ~130 pt wide. A soft matte ivory-white 3D "clay" padlock: rounded-square body
   with a **recessed keyhole** (shaded soft light gray, not a dark hole), thick
   rounded shackle. Built from **two stacked image layers** so it can animate:
   - `lock-shackle.png` — the U-shaped shackle alone (rendered behind the body).
   - `lock-body.png` — the body alone with keyhole.
   In the idle state they compose into exactly the closed lock in the mockup.
   Generate both via the icon foundry (§6); use the mockup's lock as the strict
   visual reference.

4. **Stats row** — y ≈ 396 pt, full width minus 24 pt margins, two groups:
   - **Left**: a 30 pt white circle chip containing a small dark filled padlock
     glyph (`icon-padlock-chip.png`), then a text block: `Time Locked` (15 pt
     semibold white) over `2h 14m` (22 pt bold white).
   - **Right** (right-aligned): text block `Screen Time` (15 pt semibold) over
     `1h 32m` (22 pt bold), then a 34 pt circle chip: deep burnt-orange
     `#C2570A` fill, thin white outer ring, white four-point sparkle glyph
     (`icon-sparkle.png`).
   Both chips are Pressables (no-op).

5. **Gym task card** — x margins 16 pt, y ≈ 424→580 pt (~156 pt tall), corner
   radius 24, overflow hidden. Fill: the gym illustration **cropped straight out
   of the mockup** (see §6.6 — do not regenerate it). Overlaid:
   - **ⓘ info button** top-right, 12 pt inset: 28 pt circle, thin white outline,
     white "i". Pressable → blank "Info" screen.
   - **`Go to gym`** bottom-left, 16 pt inset: 24 pt bold white with a soft
     shadow for legibility.
   - **`Complete` button** bottom-right, 16 pt inset: white stadium pill,
     ~44 pt tall, ~24 pt horizontal padding, near-black 17 pt semibold label.
     Pressable → triggers the completion animation (§5).

6. **Edit row** — x margins 16 pt, y ≈ 596→640 pt, radius 14. Background: dark
   warm brown, translucent over the gradient — `rgba(40,16,8,0.55)` (composites
   to ≈`#492A23` like the mockup). Left: `Edit`, 17 pt semibold white, 16 pt
   inset. Right: orange pencil glyph `#FC5F02` (`icon-pencil.png`). Pressable →
   blank "Edit" screen.

7. **Analysis row** — identical geometry, y ≈ 652→696 pt. Left: `Analysis`.
   Right: orange right-arrow `#FE6003` (`icon-arrow-right.png`). Pressable →
   blank "Analysis" screen.

8. **Tab bar** — NO bar background; five items sit directly on the gradient,
   evenly spaced, glyph centers at y ≈ 766 pt, all glyphs white ~30 pt:
   1. alarm clock (`icon-tab-alarm.png`)
   2. musical note with arc (`icon-tab-music.png`)
   3. **center home button**: 62 pt circle — thin white ring, darker-orange
      `#BC4405` disc, white spiral glyph (`icon-tab-spiral.png`). This is the
      active tab.
   4. abstract mountain/"A" mark (`icon-tab-mountain.png`)
   5. rounded-square bar-chart (`icon-tab-chart.png`)
   Each is a Pressable → blank screen named after it.

9. **Home indicator** — standard white pill on the gradient. Nothing else below.

**Press feedback everywhere:** every Pressable scales to 0.96 with slight
opacity dip over ~100 ms and springs back on release.

## 3. Blank destination screens

One reusable placeholder screen: same background gradient, centered white title
(the button's name), a back control. That's all.

## 4. Typography

SF Pro (system font). Weights per §2. Timers/counters (`2h 14m`, `1h 32m`) use
tabular numbers. All text white unless specified.

## 5. THE COMPLETION ANIMATION (build this exactly)

Reference: `unlock-animation-v15-iphone.mp4` and end-state still
`unlocked-v15-nanobanana.png`. The video has ~1 s of idle before the tap;
timeline below starts at the user's tap on **Complete**. Confetti fidelity does
NOT matter (stock library is fine); the **button swap and the shackle opening
are the parts to get right**.

| t (ms) | What happens |
|---|---|
| 0 | Tap on `Complete`. Press feedback: button scales to 0.95. |
| 80 | Haptic: `notificationAsync(Success)` — wrapped in `Platform.OS !== 'web'`; on web it simply doesn't fire. |
| 100–350 | Label crossfades `Complete` → `✓ Completed` (checkmark glyph + word). The pill stays white with near-black text and springs slightly wider to fit the longer label. The button is now permanently in this state and disabled — the animation never reverses in this prototype. |
| 350–450 | Lock anticipation: the whole lock dips — scale 0.97, translateY +3 pt — a small pre-wind before the pop. |
| 450–1100 | **Shackle pops open — pure pop-up → drift-right → drop-down. NO rotation/swing.** (Verified frame-by-frame against the reference video: the shackle stays essentially upright for the entire move.) Three overlapping phases on the shackle layer, translations only: **(a) POP UP, ~450–750 ms** — translateY springs from 0 to about −(leg length + 45 pt) so BOTH legs visibly clear the body's top edge with an air gap; slight overshoot at the apex. **(b) DRIFT RIGHT, ~550–950 ms** — while airborne, translateX eases from 0 to exactly the horizontal distance between the two shackle sockets, so the LEFT leg ends up directly above where the RIGHT leg used to sit. **(c) DROP DOWN, ~750–1100 ms** — translateY springs back down so the LEFT leg re-seats INTO the right socket (final Y ≈ 0 again), with a small landing bounce. During flight the shackle may wobble at most ±6° (playful, spring to 0° by landing) — never more; any visible swing/fling is wrong. Final pose = upright open hook standing on the top-RIGHT of the body, left leg in the right socket, exactly matching `unlocked-v15-nanobanana.png`. Simultaneously the body does a celebratory pop: scale 1.0 → 1.06 → 1.0 (spring) with a tiny −3° counter-rotation and back. |
| 500 | **Confetti fires** from the lock's center: one burst, ~150 small rectangular pieces, colors `#FFFFFF`, `#FBBF24`, `#F97316`, `#C2570A`, `#1E3A8A` (navy — the mockup confetti includes a few navy pieces for contrast). Pieces spread across roughly the upper 60% of the screen, then fall and drift down past the card for ~3 s, fading out. Stock library defaults tuned to these colors/counts are fine. |
| ~3500 | Rest state: shackle open, `✓ Completed`, confetti gone. The goal bar stays at 50% (matches the reference video). |

Implementation notes:
- Shackle and body are the two separate PNGs from §2.3 — the animation is just
  transforms on the shackle layer; nothing is redrawn.
- All springs via Reanimated `withSpring`; the sequence via `withDelay`/`withSequence`.
- Everything remains interactive during the animation (don't block the UI).

## 6. Icon foundry — standardized GPT Image asset recipe

> **Canonical version:** this method has been promoted to **`design/STYLE.md`** — the
> universal style constitution for ALL ExcerLock visual assets (four families, anchors,
> templates, manifest law). Read that first; this section remains as the prototype-build
> instance of it. On any conflict, `design/STYLE.md` wins.

This section is the standing method for creating **every ExcerLock icon/illustration
PNG**, now and in the future. It is adapted from the proven Regen recipe
(`/Users/johansardar/reform/docs/onboarding-image-gen-recipe.md` and the
solid-filled brains / protection heroes / reminders bell docs — read them if
available for the full rationale). Core idea: **generate with your built-in
image generation (GPT Image 2) on a flat magenta field, then chroma-key to a
transparent PNG locally.** Never ask the model for transparency (it can't), and
never ship an un-keyed asset.

### 6.1 Pipeline (identical for every asset)

1. Generate 1024×1024 with the built-in `image_gen` tool using a prompt built
   from the template in §6.3.
2. If the output isn't 1024×1024, `sips --resampleHeightWidth 1024 1024` **while
   still opaque** (resize before keying — cleaner edges).
3. Key it: `python3 prototype/scripts/remove_chroma_key.py in.png out.png
   --edge-contract 1 --despill` (write this script per §6.4 if it doesn't exist).
4. Validate (§6.5). Only then copy into `prototype/assets/icons/`.

### 6.2 The two ExcerLock style families

**Family A — "soft clay hero"** (ONLY for the hero lock body + shackle):
> soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral
> light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are
> shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.

**Family B — "flat white glyph"** (all UI icons):
> flat 2D vector-like bitmap glyph; pure white #FFFFFF strokes and fills;
> rounded stroke ends and joins, generous stroke weight; simple friendly
> iOS-glyph geometry; zero gradients, zero glow, zero 3D, zero outline-only
> wire art — solid confident shapes.

Palette lock for any future colored icon: ExcerLock tokens only — burnt orange
`#C2570A`, bright orange `#F97316` / `#FC5F02`, amber `#FBBF24`, ivory `#F4F1F5`,
white. Never cyan/teal/purple/pink in shipped icons.

### 6.3 Master prompt template (fill the ⟨slots⟩, keep everything else verbatim)

```text
Use case: ⟨new-asset-with-style-reference | precise-object-edit⟩
Asset type: 1024 × 1024 ExcerLock iOS ⟨icon | hero illustration⟩: ⟨ASSET NAME⟩.
Input images: ⟨list references and give each ONE narrow job, e.g. "Image 1 is the
strict identity/composition reference; match its subject exactly" — or delete
this line for from-scratch glyphs⟩.
Primary request: Create one single centered ⟨SUBJECT SENTENCE — what the icon
depicts, its orientation, its key recognizable features⟩. The subject must read
instantly at ⟨DISPLAY SIZE⟩ pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every
background pixel to every corner, solely for chroma-key removal. No gradient,
texture, shadow, glow, vignette, floor, reflection, particles, or lighting
variation in the background.
Style/medium: ⟨paste Family A or Family B block from §6.2⟩.
Color palette: ⟨palette line — e.g. "pure white #FFFFFF only in the subject" —
plus⟩ Do not use cyan, blue, teal, pink, gold, red, gray, black, or magenta in
the subject unless listed above.
Composition/framing: one centered subject with generous even padding; every
subject pixel well separated from all four edges; strong readable silhouette at
⟨DISPLAY SIZE⟩ pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow
wire art and not merely thickened outlines. Crisp clean outer edge for chroma
keying. No outer halo, bloom, cast shadow, energy field, black box, text, UI,
frame, face, character, logo, or watermark. One subject only.
```

Load-bearing clauses — never simplify away (learned the hard way on Regen):
1. The uniform `#FF00FF` backdrop sentence with its full forbidden-effects list.
2. "opaque and confidently solid-filled … not merely thickened outlines."
3. One narrow job per reference image, with explicit do-not-copy lists.
4. The zero-realism trio in Family B / the "recessed, never dark holes" line in Family A.
5. The display-size readability target.
6. The closing negative list (no text/face/logo/halo/shadow).
7. "One subject only."

If a result is close but flawed, do a **precise-object-edit** follow-up: feed the
flawed output as Image 1 ("strict edit target"), state ONE targeted correction,
and restate every invariant (identity, scale, framing, palette, magenta backdrop).
Restating invariants is what stops drift.

### 6.4 `prototype/scripts/remove_chroma_key.py` (write once)

Python 3 + Pillow + numpy. Behavior:
- Any pixel within a chroma distance of magenta (`R high, G low, B high` —
  e.g. `R>180, B>180, G<110`, plus a graded band for partial matches) → alpha 0,
  with a smooth alpha ramp on the band so edges anti-alias.
- `--despill`: for remaining pixels, clamp the magenta cast: where `R` and `B`
  both exceed `G` significantly, pull them toward `G` to kill pink fringe.
- `--edge-contract N`: erode the alpha channel by N px (default 1) to remove the
  last fringe ring.
- Output RGBA PNG, same size.

### 6.5 Validation gates (every asset, no exceptions)

- Exactly 1024×1024 RGBA (or the stated target size).
- All four corner alphas exactly 0.
- Zero residual chroma pixels by the rule: `alpha > 0 AND R > G+60 AND B > G+60`.
- Then the real test: render the icon **in the running Expo-web app on the
  actual gradient** at its display size, screenshot the browser frame, and
  judge there — not in an image viewer. No magenta fringe, no box, reads
  crisply.

### 6.6 Asset manifest for THIS build

Crop (do not generate) from `design/mockups/nosparkle-v14-best.png`:

| Asset | How |
|---|---|
| `gym-card-raw.png` | PIL crop box `(48, 1331, 1131, 1820)` — the full task-card illustration. **It has "Go to gym", the ⓘ circle, and the white Complete pill baked into the pixels** — they must be removed (next row) or they'll double under your real components. |
| `gym-card.png` | Clean `gym-card-raw.png` with ONE GPT Image precise-object-edit: *"Use case: precise-object-edit. Image 1 is the strict edit target. Remove only the white 'Go to gym' text, the thin-outlined circular i info icon, and the white rounded 'Complete' button, filling those areas with seamlessly continued matching gym-illustration content (floor tiles, window light, equipment). Change nothing else — preserve the illustration's exact style, colors, composition, and framing. No text, UI, logo, or watermark anywhere."* Verify no ghost text remains before shipping. |
| `lock-reference.png` | PIL crop box `(340, 520, 840, 1130)` — the closed hero lock, **used only as the strict style/identity reference image** for the two generated lock assets below (its orange background is fine for a reference; it never ships). |

Generate via the foundry (Family A, reference = `lock-reference.png`):

| Asset | Subject sentence | Display size |
|---|---|---|
| `lock-body.png` | the padlock BODY alone from the reference — rounded-square ivory clay body with recessed light-gray keyhole, no shackle, top edge showing the two shackle sockets | ~130 pt |
| `lock-shackle.png` | the padlock SHACKLE alone from the reference — one thick rounded ivory U-shaped shackle, upright, legs at the bottom | ~110 pt |

Generate via the foundry (Family B, from scratch, white glyphs):

| Asset | Subject sentence | Display size |
|---|---|---|
| `icon-padlock-mini.png` | tiny simple filled padlock, closed | 12 pt (dark tint applied in code) |
| `icon-padlock-chip.png` | small simple filled padlock, closed | 18 pt (dark tint applied in code) |
| `icon-sparkle.png` | one four-point star sparkle, points up/down/left/right | 18 pt |
| `icon-pencil.png` | diagonal pencil at 45°, tip lower-left | 20 pt (tinted `#FC5F02` in code) |
| `icon-arrow-right.png` | right-pointing arrow with straight shaft and rounded head | 20 pt (tinted `#FE6003` in code) |
| `icon-info.png` | lowercase "i" inside a thin circle outline | 24 pt |
| `icon-tab-alarm.png` | classic round alarm clock with two top bells | 30 pt |
| `icon-tab-music.png` | musical eighth-note with a small curved arc beside it | 30 pt |
| `icon-tab-spiral.png` | round concentric spiral coil | 30 pt |
| `icon-tab-mountain.png` | abstract twin-peak mountain forming a subtle letter A | 30 pt |
| `icon-tab-chart.png` | rounded square containing three vertical bar-chart bars | 30 pt |

Tip: white-on-magenta keys cleanly (white's green channel is high, magenta's is
low); `--despill` removes the pink edge blend. For glyphs that will be tinted in
code, still generate them white — tint via the `tintColor` style.

Match each generated glyph against its counterpart in the mockup before shipping
— the mockup is the identity reference for all of them.

## 7. Acceptance checklist (verify before declaring done)

- [ ] App runs via `npx expo start --web` in Chrome; the UI lives in the fixed
      393×852 centered frame (correct iPhone proportions — screenshot the frame
      and confirm its aspect ratio ≈ 0.461 (393/852)). **No simulator was used.**
- [ ] Side-by-side: a screenshot of the 393×852 web frame vs
      `nosparkle-v14-best.png` (downscaled) — layout, colors, sizes, and copy
      match; no Mobbin footer.
- [ ] Every listed control responds to touch with press feedback; ⓘ, Edit,
      Analysis, and all five tabs reach blank named screens and can go back.
- [ ] Tapping Complete plays the full §5 sequence: label swap → shackle spring
      (overshoot + settle, correct pivot and final pose vs
      `unlocked-v15-nanobanana.png`) → confetti burst → persistent end state.
- [ ] The haptic call exists, correctly guarded for web (it will only fire on a
      real device later).
- [ ] All foundry assets pass §6.5 gates; screenshots on the real gradient look
      clean at display size.
- [ ] The mockup/video files in `design/mockups/` are untouched.

## 8. Guardrails

- Build only inside `prototype/`. Do not modify anything in `design/` or `docs/`.
- Keep all generated icon prompts + outputs documented in
  `prototype/assets/icons/FOUNDRY.md` (per-asset: exact prompt, output file,
  validation numbers) so any icon can be regenerated the same way — mirror the
  Regen docs' record-keeping.
