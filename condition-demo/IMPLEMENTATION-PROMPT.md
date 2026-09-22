# Implementation prompt — "How your plan works" onboarding demo (ExcerLock, app-next)

Target agent: Pi, model `gpt-6-astra`, low effort. This prompt is self-contained: it describes the accepted prototype exactly so you can reproduce it in the shipping app without re-deriving anything. Read the prototype once for reference, then build from this spec.

Reference material (read-only):

- Accepted prototype (single HTML file, inline CSS + JS): `/Users/johansardar/firstmates/excerlock-firstmate/data/condition-demo-prototype-f1/prototype/index.html`. Same tree in the worktree: `/Users/johansardar/.treehouse/excerlock-app-ad0bb5/17/excerlock-app/condition-demo/index.html`. Standalone copy with assets inlined: `.../data/condition-demo-prototype-f1/prototype-standalone.html`.
- Character frames: `.../prototype/assets/frames/` (phone in hand: `walk-1.png … walk-6.png`, `stand-phone.png`, `stand-ahead.png`) and `.../prototype/assets/frames-free/` (hands free: `walk-1.png … walk-6.png`, `stand-a.png`, `stand-b.png`). Every frame is a 435×648 RGBA PNG, transparent background, feet on the bottom row (y = 644), head-centred horizontally. Provenance and prompts: `.../prototype/gen/PROVENANCE.md`, `.../prototype/gen/character-sheet-v1.txt`, `.../prototype/gen/character-sheet-v2-handsfree-edit.txt`.
- Screenshots of every accepted state: `.../prototype/screenshots/*.png` (402×874 CSS px). Match these.
- Report with the condition inventory: `.../data/condition-demo-prototype-f1/report.md`.

Repository: `JohanSardar/excerlock-app`, app in `app-next/` (Expo SDK 57, React Native, `react-native-reanimated` 4.5.1, `react-native-gesture-handler` 2.32, `react-native-svg` 15.15, `expo-linear-gradient`). Design tokens: `app-next/src/design-system/tokens.ts`. Read `design/UI-STYLE.md` before building any screen. Existing motion helpers you should reuse: `app-next/src/motion/` (`Confetti.tsx`, `TickingNumber.tsx`, `Reveal.tsx`, `motionTokens.ts`, `haptics.ts`, `useMotion.ts`).

Deliverable: a new onboarding step rendered between S3 (plan summary, "Your plan is ready") and S4, that plays the demo for the rule the user just built. Everything below is required unless marked "review only" (review-only parts exist in the prototype for the captain's review rail and are not shipped).

---

## 0. Captain-accepted decisions (do not reopen)

1. Lock and unlock are instantaneous in the demo. "Unlock while walking": apps open the instant the walker walks and lock the instant they stop. No "verifying", no grace countdown, no "stopped" interstitial.
2. There is no "tomorrow" / "next day" phase or screen in any scenario. Loops restart directly.
3. The phone card shows the shipped on-device shield copy (ShieldContent.plist: title "Apps locked. Complete your exercise condition to unlock.", subtitle "Open ExcerLock to manually trigger a detection.", single button "Close"). The per-condition preview copy exists in the prototype as a review toggle only; do not ship it.
4. The treadmill variant of "Unlock while walking" ships, using the hands-free frame set.
5. Heading copy is "How your plan works".
6. Character frames are the generated Sunburst frames listed above. Do not regenerate or redraw them. Do not substitute a different character.

---

## 1. Where the step lives

- Step id vocabulary: `app-next/src/onboarding/stepId.ts` (`onboardingStepIdPattern`). Add a new tail step id (suggest `S3b`; if the regex must stay strict-alphanumeric, use `D2` or extend `S[1-4]` to a pattern that includes the new id) and insert it in `tail` in `app-next/src/onboarding/flow.ts` right after `'S3'`. Update `flowOrder.ts` known-tail validation automatically follows from `tail`.
- Render it in `app-next/src/features/onboarding/OnboardingRoute.tsx` next to the `S3` branch. Input: the same `draft` (`RuleDraft`, `app-next/src/features/rules/draft.ts`: `activity`, `walkingMode: 'steps'|'minutes'|'state'`, `stepGoal`, `walkMinutes`, `gymMode: 'time'|'arrival'`, `gymMinutes`) and `toSchedule(schedule)` used by `PlanSummary`. Also read the walk-place answer from `flow.answers` (W1: `walkPlaces` includes `'treadmill'`) to choose the treadmill variant.
- The S3 "Use this plan" commit (`commitPlan`) stays on S3's Continue. The new step's Continue only advances (`flow.advance`). Back returns to S3.
- Use `OnboardingShell` for progress bar, back, and the Continue CTA. Continue label: the default. The demo must not block Continue.
- Analytics: fire the existing onboarding step-view event with the new step id and a `scenario` property (`walk-state` | `walk-steps` | `walk-minutes` | `gym-arrival` | `gym-minutes`) and `place` (`outside` | `treadmill`) for walk-state.

Scenario selection from the draft:

| draft | scenario |
|---|---|
| activity walking, walkingMode state | `walk-state` (place = treadmill if the user picked treadmill in W1, else outside) |
| activity walking, walkingMode steps | `walk-steps`, goal = `stepGoal` |
| activity walking, walkingMode minutes | `walk-minutes`, goal = `walkMinutes` |
| activity gym, gymMode arrival | `gym-arrival` |
| activity gym, gymMode time | `gym-minutes`, goal = `gymMinutes` |

---

## 2. Screen hierarchy (portrait iPhone, 402×874 pt reference; must scale to 375×667 and 430×932)

Top to bottom inside the onboarding shell (shell supplies the status area, the 4 pt progress bar with orange fill, and the footer CTA):

1. **Header** (padding 18/24/10):
   - `h1` "How your plan works": 26/32, weight 700, letter-spacing −0.01em, ink `#1D1D22`.
   - Support line (6 pt below): 15/20, grey `#66666F`. Text = the shipped condition sentence for the rule + schedule tail. Use `conditionSentence()` from `app-next/src/features/rules/conditionSentence.ts` and the schedule label from `app-next/src/domain/scheduleLabel.ts`. Prototype strings: "Your apps are blocked unless you are walking all day every day", "Your apps are blocked until you walk 5,000 steps all day every day", "…until you walk for 30 minutes…", "…until you arrive at the gym…", "…until you spend 45 minutes at the gym…". Window variant tail: " from 9 AM to 9 PM every day".
   - Rule row (10 pt below): 24 pt orange circle glyph (white 14 pt icon: walking figure for walking rules, dumbbell for gym, clock for minute goals, footprints for steps) + rule name (`ruleName()` from `app-next/src/domain/ruleName.ts`, 13/18 weight 600, ellipsis) + 4 pt grey dot + schedule label (13/18 weight 400 grey, nowrap).

2. **Stage** (margin 6/24/0, radius 28, overflow hidden, flex 1, min-height 360): the illustrated orange world. Background vertical gradient `#F2792C` 0% → `#F58E42` 55% → `#F9AE72` 100%. Children (z-order low→high):
   - Parallax park scene (§3).
   - Left content: character (§4), and per scenario an info card, treadmill art, or map slab (§6).
   - Phone card (§5): absolute, right 14, top 76, 170×312, radius 26, white, shadow `0 16 36 rgba(120,50,10,.22)`.
   - Status card ("pill"): absolute top 12, left/right 12, white, radius 18, padding 8/14, shadow `0 6 18 rgba(120,50,10,.18)`. Grid: 8 pt status dot (orange) · title 13 pt weight 600 ink (nowrap, ellipsis) · optional right-aligned count (tabular, 75% opacity) · second line caption 11/14 weight 500 grey spanning under title+count. Locked variant: background ink `#1D1D22`, white text, white dot, caption `rgba(255,255,255,.8)`. Transition background/color 240 ms.
   - Timeline strip: absolute left/right 14, bottom 10, height 30. Row 1 (14 pt): phase label left, `elapsed / total s` right, 11 pt weight 600 ink, tabular numerals. Row 2 (10 pt, 6 pt gap): one rounded segment per phase (radius 5, gap 3, flex weight = phase duration, base `rgba(29,29,34,.16)`, active `rgba(29,29,34,.26)`), each filling left→right with orange as its phase elapses; completed segments 100%, future 0%. Segments are tappable: tap jumps to that phase start. For walk-state add one extra dark segment (`rgba(29,29,34,.4)`, weight 2.5) representing the manual hold; it fills while holding and gets a 2 pt ink outline while the manual state is active; other segments dim to 55% during manual mode.
   - Confetti layer (§9).

3. **Hold control** (walk-state only, padding 12/24/0): 54 pt tall, radius 27, 1 pt ink border, background `rgba(255,255,255,.62)`. Left: 26 pt ring at x 12 (conic progress orange over divider `#E5E5EA`, 5 pt inner white disc). Centre: label "Continue walking" 16 pt weight 600 + small "hold to walk" 13 pt weight 500 grey. States in §8.

4. **Footer CTA** (shell): "Continue", 54 pt, radius 27, orange `#C94710`, white 17 pt weight 600, pressed `#AE380A`.

Text colour rule (project law): no orange text anywhere on this screen except white-on-orange fills.

Responsive: the stage flexes to fill between header and hold/footer; at 375×667 the stage is ≥ 300 pt tall, so scale the phone card and left content by `min(1, stageHeight/360)` around their top-left/top-right anchors rather than letting them overlap the timeline. Never let the person overlap the phone card: the person occupies x 10–170, the phone x 218–388 at 402 wide; at 375 wide the two columns shrink proportionally (scale 0.93).

---

## 3. Park scene (parallax world)

An SVG `viewBox 0 0 400 400`, `preserveAspectRatio xMidYMax slice`, anchored to the stage bottom. Four groups scrolled horizontally by a shared "distance" value `d` (see §7). Each group's shapes repeat every 400 units so `translateX(-(d·k) mod 400)` is seamless.

| group | content | speed k |
|---|---|---|
| p0 clouds | 4 clouds (circle clusters `rgba(255,255,255,.85)`) at (40,60)s1, (300,40)s.8, (480,70)s.9, (740,40)s1 | 0.08 |
| p1 far hills | hill band, fill `#F9C79A`, baseline y≈230 | 0.18 |
| p2 near hills + trees | hill band `#F6B583` baseline y≈275; 5 round trees (trunk `#8A4A2B` 8×34 radius 4, canopy three circles r22/14/14) at x −60,120,330,520,700, canopies alternating `#E8823F` / `#F0955B`, scales 1/1.15/.95/1.1/1 | 0.45 |
| p3 path | hill band `#FBDCC1` y≈318; path band `#FFF1E3` from y≈350; five pebbles `#F4C79E` 14–20×6 radius 3 near y 370–380 | 1.0 |

Hill path (for each band, y = baseline): `M-400 y+60 C -300 y, -200 y+80, -100 y+20 S 100 y+70, 200 y+10 S 400 y+70, 500 y+20 S 700 y+70, 800 y+10 L 800 400 L -400 400 Z`.

The world only moves while the character is in a walking pose (§7). When the character stands, the world stops instantly (no easing), which is what makes "stop = lock" read.

---

## 4. Character and the walking cycle (highest polish bar)

### 4.1 Placement
- Container 160×238 pt, absolute left 10, bottom 52 (so the feet sit on the path band). Scenarios with an info card use 145×216 at left 16. Image `resizeMode: contain`, anchored bottom-centre. Because all frames share one 435×648 canvas with feet on the same bottom row and the head centred, swapping frames never moves the ground contact or the head: **never crop, trim or re-centre individual frames**; always draw the full canvas.
- The character never translates horizontally. Forward motion is conveyed by the parallax world only. Any horizontal drift of the sprite is a bug.

### 4.2 Frame meaning (side view, facing right)
walk-1 right foot forward, heel contact · walk-2 right leg planted, body lowest · walk-3 legs passing mid-stride · walk-4 body highest, push-off · walk-5 left foot forward, heel contact · walk-6 legs passing the other way · stand-phone / stand-a standing, feet together, looking at the phone · stand-ahead / stand-b standing, looking ahead.

### 4.3 Cycle (accepted look)
Sequence, one full stride: `walk-2 → walk-1 → walk-4 → walk-6 → walk-2 → walk-3 → walk-5 → walk-3`, then repeat from the start. Rate **9 frames per second** (one cycle = 8 frames = 0.889 s). The seam is between the last `walk-3` and the first `walk-2`, which are adjacent poses, so the loop has no visible jump.

Render with **two stacked images and an opacity crossfade**: image A shows frame `i`, image B shows frame `i+1`, B's opacity = fractional position between them (linear). Frame indices come from a continuous walk clock `w` (seconds spent walking, §7): `x = w·9`, `i = floor(x) mod 8`, `f = x − floor(x)`. Update on every animation frame on the UI thread (Reanimated `useFrameCallback` or a derived value from a shared clock), not via `setState`.

Vertical bob: container `translateY = −3 · |sin(x·π/2)|` pt (two bobs per stride, peaks on push-off frames). Standing bob (idle breathing): `translateY = −1.2 · sin(t·2.2)` pt where `t` is scene time.

Rules that make it convincing and must all hold:
1. **No foot sliding**: the world's scroll speed is tied to the same walk clock as the frame index (`d += dt·60` px per second only while walking). Both freeze together; both resume together. If you tune speed, tune both.
2. **No popping**: all 8 (×2 sets) frames are decoded before the screen is shown (`Image.prefetch` or `expo-image` with `cachePolicy memory`, or a single sprite atlas). The first walk frame is drawn before the first crossfade tick; never show an empty frame.
3. **No baseline jitter**: full-canvas frames, `contain` fit, bottom anchor, integer container size. Do not round the crossfade to nearest frame; do not use `resizeMode: cover`.
4. **No seam**: the sequence above is cyclic; never pause on frame 8 or reset the clock at phase boundaries. The walk clock only accumulates while walking and is never reset within a scenario loop except when the scenario restarts from `t = 0` (then it may reset too).
5. **Stop is instant**: switching from walk to stand swaps to the stand frame on the next frame with B's opacity set to 0. Do not tween into the standing pose. Resume from stand → walk continues the clock where it left off.
6. **Reduced motion** (`AccessibilityInfo.isReduceMotionEnabled`): show frames without crossfade (B hidden, step at 9 fps), no bob, no confetti, parallax still moves.

Which set: `frames` (phone in hand) everywhere except walk-state on a treadmill, which uses `frames-free` (stand-a for "looking at phone", stand-b for "looking ahead").

Asset packaging: copy both frame folders into `app-next/assets/condition-demo/frames/` and `.../frames-free/`. Keep file names. Optionally downscale to 2× device (max 320×476) to save memory; keep aspect ratio and bottom alignment. Do not run any content-changing image processing.

### 4.4 Treadmill art (walk-state, place = treadmill)
SVG 190×120 at left 0, bottom 40, behind the person (z 1): dark base `#2B2E3A` 178×22 radius 11 at y 88; belt `#3E4252` 154×9; five belt ticks `#5A5F72` 10×5 spaced 30 apart (scroll them left with the p3 parallax speed so the belt moves); upright post `#3E4252` 12×76 at x 158; console `#2B2E3A` 46×26 at (140,6); a white 16×26 "phone" rotated −8° at (153,0). The character stands on the belt (person bottom 52 as usual).

---

## 5. Phone card (TikTok start state ↔ native shield)

170×312, radius 26, white, no hardware, no notch, no bezel. Three stacked screens, cross-dissolved with 240 ms opacity; at most one visible except that the shield always keeps the frozen feed rendered beneath it so the blur reads as "an app is under this".

Shared: "9:41" centred at top 8 (10 pt weight 600), home bar 56×4 centred at bottom 6.

**TikTok start state** (`tiktok`, `since` = seconds since it appeared):
- `since < 1.0`: black splash, centred mark: TikTok note glyph 52×60 (three offset copies: cyan `#69C9D0` offset (−2.2,−2.2), red `#EE1D52` offset (+2.2,+2.2), white on top) above "TikTok" 15 pt weight 700. Fade out over 300 ms at 1.0 s.
- `since ≥ 1.0`: feed. Background radial gradient `120% 70% at 30% 70%` `#3a3a44 → #1b1b1f 55% → #0b0b0d`; a soft lighter blob (`rgba(255,255,255,.06)`, left 18% right 34% top 38% bottom 32%, radius 40/40/20/20) as the "video subject"; top tabs "Following" / **For You** (10 pt weight 600, 60% white, active white with a 2 pt underline); right action rail (bottom 74, right 10, 12 pt gaps): avatar 24 pt with 2 pt white ring on `#6b6b73`, heart "128K", speech bubble "2,431", bookmark "9,870", share "Share", spinning disc 22 pt (3 s per rotation); caption bars bottom-left (52×8 white, 100×6 55% white, 70×6); bottom tab bar (five 14 pt squares 55% white; centre "plus" 26×18 white with cyan/red side shadows).
- Loading spinner (26 pt, 3 pt ring, 25% white track, white head, 0.9 s per rotation) centred, visible until `since ≥ 1.7`, then fades 200 ms.
- Any time the feed is shown for "the rest of the day" pass `since = 99` (feed, no spinner).

**Shield** (`shield`): the shipped Screen Time shield look. Background `rgba(255,240,229,.96)` over a blur of the feed (`backdrop blur 18`, i.e. `systemThickMaterialLight` tinted `#FFF0E5` at 0.96 as in `app-next/targets/ShieldConfiguration/ShieldConfigurationExtension.swift`). Content column centred, padding 0/14: top 78 pt then the ClayLock icon 34 pt (orange `#C94710` padlock: rounded body 189×154 radius 36, shackle, cream keyhole `#FFF0E5`), 8 pt gap, title 11.5/14 weight 700 (max width 136) "Apps locked. Complete your exercise condition to unlock.", 8 pt gap, subtitle 9/12 grey `#6E6871` "Open ExcerLock to manually trigger a detection." Bottom: primary button full width 28 pt radius 14 orange, white 10.5 pt weight 600 "Close", at bottom 22, left/right 16. No secondary text line. Status time and home bar ink.

**ExcerLock cards** (`xl`, treadmill only): app gradient `#F6B583 → #FBE2CF 45% → #FFF7F1`, padding 40/12/0. `prop`: 96 pt tile (`#FFF0E5`, radius 20) with the orange walking glyph 60 pt, h3 12/15 "Prop your phone and walk", body 9.5/13 grey "Set it upright facing you. The scan starts on its own once you're walking.", bottom orange button "I'm walking". `scan`: 96 pt conic progress ring (orange over `#E5E5EA`, 80 pt white centre showing "NN%") that fills 0→100% over the phase, h3 "Reading your stride", body "Keep walking. A few seconds.", no button.

---

## 6. Scenarios, phases and exact timing

Every scenario is a fixed-length loop of phases with a scene clock `t` (seconds, 0 → total, then wraps to 0). `local = t − phase.start`, `p = local / phase.dur` (clamped 0..1). All easing named below; where none is named, linear. Loop forever until the user leaves the step. Restart from 0 when the step (re)appears.

Copy tokens (existing strings; sources in `app-next/src/content/`): `home.locked` "Apps are blocked", `home.met` "Unlocked for the rest of today", `home.walking` "Unlocked while you walk", `home.atGym` "Unlocked while at the gym", `home.confirmingGym` "Confirming you're here", `home.propped` "Unlocked while your phone stays in place", `gym.confirming` "Confirming you're here", `gym.confirmingBody` "Stay put for a moment.", `gym.counting` "Your gym time is counting", `gym.inside` "Location detected at the gym", `gym.insideBody` "You're at West Loop Fitness." (use the user's first saved gym name if one exists, else the example). Gym name in the demo: "West Loop Fitness".

### 6.1 `walk-state` — Unlock while walking (outside). Total 8 s.

| phase | dur | person | world | phone | status card | caption |
|---|---|---|---|---|---|---|
| walking | 5 | walk cycle | scrolls | tiktok, `since = local` (splash 1 s, spinner to 1.7 s, then feed) | white: "Unlocked while you walk" | "Apps open while you walk" |
| blocked | 3 | stand-ahead (instant) | frozen | shield (instant switch with the 240 ms dissolve) | locked (ink): "Apps are blocked", count "N s" = ceil(remaining) | "Stopped — your apps lock right away. Walk to open them" |

Loop wrap blocked → walking: person resumes the walk clock, world resumes, phone dissolves to TikTok splash again (`since` restarts at 0 so the launch state replays). Timeline labels: "Walking · apps open", "Stopped · blocked".

### 6.2 `walk-state` treadmill (place = treadmill). Total 13 s. Uses `frames-free` and the treadmill art.

| phase | dur | person | phone | status card | caption |
|---|---|---|---|---|---|
| prop | 2 | stand-a (idle bob) | xl `prop` | white: "Phone propped on the console" | "Set the phone upright, facing you" |
| scan | 3 | walk cycle (world scrolls, belt ticks move) | xl `scan`, ring p = local/3 | white: "Reading your stride", count "N s" remaining | "Keep walking a few seconds" |
| walking | 5 | walk cycle | tiktok `since = local` | white: "Unlocked while you walk" | "Unlocked while your phone stays in place" |
| blocked | 3 | stand-b, instant | shield | locked: "Apps are blocked", count remaining s | "Stopped — your apps lock right away. Walk to open them" |

### 6.3 `walk-steps` — Walk N steps (N = goal, 500–30,000). Total 11 s. Stage gets the info card layout (person 145×216 at left 16).

Info card: absolute left 14, top 76, width 170, white, radius 18, padding 10/12/12, shadow `0 10 26 rgba(120,50,10,.16)`. Label "TODAY" 11 pt weight 600 grey uppercase letter-spacing .02em; value line 16/20 weight 700 tabular "<progress>" + small " / N steps" (12 pt weight 600 grey); 8 pt progress bar (divider track, orange fill, radius 4) 8 pt below.

| phase | dur | person | phone | card | status card |
|---|---|---|---|---|---|
| walking | 7 | walk cycle, world scrolls | shield (locked all along) | progress = round(N · easeInOut(p) / 50) · 50, bar width = progress/N; use the existing `TickingNumber` for the number | locked: "Apps are blocked", count "<N−progress> to go"; caption "Your steps count all day, with or without ExcerLock open" |
| unlocked | 4 | stand-phone, idle bob | tiktok `since = local` (launch replays) | progress = N, bar 100%, label "GOAL REACHED" | white: "Unlocked for the rest of today"; caption "Unlocks your apps for the rest of the day" |

`easeInOut(p) = p < .5 ? 2p² : 1 − (−2p+2)²/2`. Confetti bursts at the walking→unlocked boundary (§9). On loop wrap the card snaps back to 0 and the shield returns (no tomorrow screen).

### 6.4 `walk-minutes` — Walk N minutes (5–180). Identical to 6.3 with minutes: value " / N min", count "<N−progress> min to go", captions "Your walking minutes add up through the day" / "Unlocks after your walking minutes are complete". Progress increments of 1 (not 50).

### 6.5 `gym-arrival` — Arrive at the gym. Total 13 s. Left content is the map slab; no character.

Map slab: absolute left 14, top 76, 170×312, radius 26, background `#F3EBDF`, shadow `0 16 36 rgba(120,50,10,.22)`. SVG `viewBox 0 0 170 328`: blocks `#EADFCC`, a green park block `#DDE8C9` with `#CFE0B4` tree discs bottom-right, buildings `#E4D5BE`, the gym building `#F0B98C` 62×70 radius 8 at (104,118) with a white sign bar, white roads (vertical x 30–52 full height, horizontals y 100–122 and 198–222, a narrow one x 96–104 between them) with dashed `#E8DCCB` centre lines. Gym radius: circle centre (132,148) r 58, fill `rgba(201,71,16,.12)`, 1.5 pt orange dashed stroke `4 3`. Gym pin at (132,130): orange teardrop scaled 1.35 with a white 9 pt disc and a tiny orange dumbbell. Route path (invisible): `M 40 306 L 40 210 L 118 210 L 118 168`. User dot group follows the path: 8 pt blue `#2F7CF6` disc with 3 pt white stroke, 18 pt halo `rgba(47,124,246,.18)`, plus a pulse circle. Confirm ring: r 26, 4 pt blue stroke, round caps, dasharray 163.4, rotated −90°, drawn around the dot when confirming. Check badge: 16 pt orange disc with white 3.5 pt check, placed 34 pt above the dot when confirmed.

Map caption card: absolute left 14, bottom 50, width 170, white, radius 14, padding 8/10, bold line 13 pt + grey 12/16 line.

| phase | dur | dot | map extras | phone | status card | map caption |
|---|---|---|---|---|---|---|
| approach | 4 | path fraction = easeInOut(p) · 0.995 | — | shield | locked "Apps are blocked" | "Walking to the gym" / "Arrival radius: 100 m around West Loop Fitness" |
| confirming | 3 | at end of path (inside radius) | confirm ring visible, dashoffset = 163.4·(1−p); pulse radius 10 + 14·(t mod 1) | shield | locked "Confirming you're here", count "N s" = ceil(30 − 30p) | "Confirming you're here" / "Stay put for a moment." |
| unlocked | 4 | at end | check badge on | tiktok `since = local` | white "Unlocked for the rest of today" | "Location detected at the gym" / "You're at West Loop Fitness." |
| leave | 2 | path fraction = 1 − easeInOut(p)·0.6 (walks back out) | check badge hidden, ring hidden | tiktok `since = 99` | white "Unlocked for the rest of today" | "Leaving the gym" / "Today stays unlocked" |

Confetti at confirming→unlocked. Loop wraps to approach: dot jumps to the start, shield returns.

### 6.6 `gym-minutes` — Spend N minutes at the gym (10–180). Total 18 s. Map slab as 6.5 plus a time card (same style as the steps info card, label "AT THE GYM", value "<progress> / N min", width 170, top 54 over the map, hidden until counting).

| phase | dur | dot | phone | card | status card | map caption |
|---|---|---|---|---|---|---|
| approach | 4 | easeInOut(p)·0.995 | shield | hidden | locked "Apps are blocked" | "Walking to the gym" / radius line |
| confirming | 3 | inside | shield | hidden | locked "Confirming you're here" + "N s" | "Confirming you're here" / "Stay put for a moment." |
| counting | 6 | inside, check on | tiktok `since = local` | progress = round(N·p), bar fills | white "Unlocked while at the gym", count "<N−progress> min to go" | "Your gym time is counting" / "Leaving before N min locks your apps again" |
| unlocked | 3 | inside, check on | tiktok `since = 99` | progress N, 100% | white "Unlocked for the rest of today" | "Goal reached" / "Unlocked for the rest of today" |
| leave | 2 | 1 − easeInOut(p)·0.6 | tiktok `since = 99` | 100% | white "Unlocked for the rest of today" | "Leaving the gym" / "Today stays unlocked" |

Confetti at counting→unlocked.

---

## 7. Clock, walk clock and world distance

- Scene clock `t` advances by `dt = min(0.1, frameDelta)` seconds each animation frame while playing. Wrap: `t ≥ total → t −= total`.
- `walking` is a boolean the scenario sets each frame (true in walk-cycle phases: walking, scan; and in the manual hold "walking" state). While `walking`: `walkClock += dt` and `dist += dt · 60`. Parallax translateX per group = `−((dist · k) mod 400)` in scene units. Nothing else moves the world.
- All of this runs on the UI thread (Reanimated shared values + `useFrameCallback` or `useDerivedValue`); React re-renders only on phase changes for text. Text that changes every frame (counts, elapsed seconds, percentages) should use Reanimated text props / `TickingNumber`, throttled to ≤ 10 updates/s.
- Determinism: given `t`, every visual is a pure function of `t` (plus `walkClock`/`dist` for the cycle position). Expose a test hook (dev only) equivalent to the prototype's `window.demo` (`select`, `set`, `jump(phase, local)`, `pause`, `play`, `hold`, `release`, `tick(s)`, `state()`) via a testing port so the e2e harness can jump to a phase and read the status text, phone mode (`tiktok` | `shield` | `excerlock`) and locked flag.

---

## 8. Press-and-hold "Continue walking" (walk-state only)

Semantics (accepted): **press = walking and unlocked immediately; release = stopped and blocked immediately; after 3 s blocked the automatic loop resumes at the walking phase.**

- Gesture: `react-native-gesture-handler` `LongPress`/`Pan` with `minDuration 0` or a manual gesture: `onBegin` → `beginHold()`, `onFinalize`/`onEnd`/cancel → `endHold()`. Also end on app background and on blur. Disable context menus/long-press callouts. `hitSlop` 8. Haptic: light impact on begin, selection tick on release (`app-next/src/motion/haptics.ts`).
- Keyboard/switch access: the button is `accessibilityRole="button"`, `accessibilityLabel="Continue walking. Press and hold to walk. Release to stop."`, `accessibilityState={{ pressed }}`; provide `accessibilityActions` [`activate`] that toggles hold on/off (on for 3 s then auto-release) so VoiceOver/switch users can drive it without a sustained press.
- Manual state machine (`manual` null when the auto loop runs):
  - `beginHold()`: if not manual → `manual = { state: 'walking', elapsed: from === 'walking' ? local : 0 }`; `justUnlocked = from !== 'walking' && from !== 'scan'` (fires confetti). If manual and `blocked` → `walking`, `elapsed 0`, `justUnlocked true`.
  - `endHold()`: if manual `walking` → `blocked`, `elapsed 0`.
  - Each frame while manual: `elapsed += dt`; if `blocked` and not holding and `elapsed ≥ 3` → exit manual and set `t` to the start of the `walking` phase (auto loop resumes).
  - While manual, the scene clock `t` does not advance.
- Rendering of the manual states reuses §6.1/6.2 rows: `walking` → walk cycle, world scrolls, tiktok `since = elapsed`, status "Unlocked while you walk" with count `floor(elapsed) s`; `blocked` → stand, world frozen, shield, status "Apps are blocked".
- Button visuals:
  - idle: label "Continue walking", small "hold to walk", ring 0%, fill 0.
  - holding (walking): class `full`: fill 100% orange, ring conic white over 35% white with orange inner disc, label white "Walking · apps open", small `floor(elapsed) s` in 85% white.
  - released (blocked, manual): label "Stopped · blocked", small "hold to walk again", fill 0, ring 0, ink border.
  - Focus ring: 3 pt orange outline offset 2 (keyboard/switch focus).
  - The timeline shows "Hold · walking" / "Hold · blocked" as the phase label while manual and the elapsed/total counter keeps showing the scene clock.

---

## 9. Confetti and unlock feedback

Use the existing `app-next/src/motion/Confetti.tsx`. Burst at every unlock moment: walking→unlocked (steps, minutes), confirming→unlocked (gym arrival), counting→unlocked (gym minutes), and on manual hold begin from a non-walking state. Prototype reference: 36 pieces 8×12 radius 2, colours `#C94710 #F47735 #FFD6BD #FFF7F1 #1D1D22`, spawned at 20–80% width, 40% height, falling 200 pt with ±110 pt horizontal drift and 260° extra rotation over 1.3 s `cubic-bezier(.2,.6,.3,1)`, staggered up to 200 ms, gone by 1.6 s. Skip under reduced motion. Pair with a success haptic.

---

## 10. Accessibility

- Stage is decorative: `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"` for the scene, phone card and character; expose one live region (the status card text + caption) with `accessibilityLiveRegion="polite"` throttled to phase changes, and read the timeline phase label as part of it.
- Every text meets 4.5:1 (ink on white/cream, white on ink/orange). Never orange text.
- Dynamic Type: header and support scale with the app's type scale; the stage uses fixed sizes (it is an illustration) but the status card title may wrap to two lines at the largest sizes; then the caption hides.
- Reduced motion per §4.3 rule 6; the phone cross-dissolves become instant.

---

## 11. Review-only parts of the prototype (do not ship)

The right-hand review rail (scenario chips, play/pause/restart, speed, phase list, parameter steppers, schedule select, shield-copy toggle, engine facts, keyboard shortcuts), the `Space`/`R`/arrow shortcuts, the "Continue → next condition" toast, and the desktop scaling. In the app the scenario and values come from the draft, the demo autoplays, and Continue advances the flow. Keep `pause` and `jump` behind the dev/testing port only.

---

## 12. Authoritative condition semantics (for copy and for the facts you must not contradict)

- Rule shape: `app-next/src/domain/types.ts:14-18` (`RuleMode`), schedule `:22-28`, lock states `:93-101`.
- Names: `app-next/src/domain/ruleName.ts` with `content/conditions.ts`; sentences: `features/rules/conditionSentence.ts`; schedule label: `domain/scheduleLabel.ts`.
- Ranges: steps 500–30,000 step 500 (`domain/stepGoal.ts:2-4`, `features/rules/goalRange.ts:3`); walking minutes 5–180; gym minutes 10–180 presets 30/45/60; gyms ≤ 5, radius 50–200 m default 100 (`engine/signals/location/gymRegions.ts:4-8`).
- Engine timers the demo deliberately does not show (do not add countdowns for them): `WALK_QUALIFY_MS 3000`, `WALK_SILENCE_MS 5000`, grace 30–300 s (`domain/walkingMachine.ts:2-11`), still-stop 10 s (`runtime/detection/strideGateConfig.ts:132`), `PICKUP_GRACE_MS 20000`, `HANDOFF_MS 60000` (`domain/proppedMachine.ts:2-3`), `GYM_CONFIRM_MS 10000` (`domain/gymMachine.ts:2`), `PRESENCE_CONFIRM_MS 30000`, `PRESENCE_EXIT_GRACE_MS 60000` (`domain/presence.ts:2-3`). The only timer-like number shown is the gym "Confirming 30 s" countdown (ceil(30 − 30p)).
- Unlock semantics: met goal → `unlockedMet` for the rest of the schedule day (`domain/resolveLock.ts:29`); presence at any active gym rule → `unlockedAtGym` (`resolveLock.ts:38`); walking state → `unlockedWalking` / `unlockedPropped`.
- Shield on device: `app-next/targets/ShieldConfiguration/ShieldContent.plist` (title, subtitle, "Close"), styling in `ShieldConfigurationExtension.swift`, icon `ClayLockIcon.swift`.

---

## 13. Verification you must run (project law, `AGENTS.md` verification loop)

1. TDD: unit tests for the phase table (durations, totals: outside 8 s, treadmill 13 s, steps 11 s, minutes 11 s, gym arrival 13 s, gym minutes 18 s), for the scenario mapping from `RuleDraft`, for the manual hold reducer (begin → walking, end → blocked, blocked+3 s → auto resume at walking), for the walk-cycle index/crossfade function (`x = w·9`, wrap at 8, seam continuity), and for the world/walk-clock coupling (dist advances iff walking). `npm run test --workspace app-next`, `npm run typecheck`, `npm run lint --workspace app-next`.
2. E2E on the pinned `ExcerLock-Next` simulator per `app-next/e2e-next/README.md`: reach the new step after S3 for each of the five drafts, jump to each phase through the testing port, assert status text / phone mode / locked flag, press-and-hold via `idb` touch down/up and assert instant unlock and instant lock, and write a fail-closed `verdict.json`. Screenshots of every phase of every scenario under `app-next/e2e-next/out/<run>/condition-demo/` and compare by eye with `prototype/screenshots/`.
3. Record a 10 s screen capture of the walking phase at 1× and inspect frame-by-frame for foot sliding, popping, baseline jitter or a loop seam; fix before shipping. Also test at 375×667 (iPhone SE class) and with Reduce Motion on.
4. This is a new onboarding step with new assets: it is new-submission material, never OTA (`docs/agents/operations.md`).

Do not modify the shield extension, the engine, or any condition semantics. Do not push or open a PR unless your own task brief says so.
