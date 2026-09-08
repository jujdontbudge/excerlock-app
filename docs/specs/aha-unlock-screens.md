# Aha unlock screens — treadmill scan and gym arrival

Status: **Ceremony screens and isolated Home test buttons built, 2026-09-07.** Native camera module builds locally; physical-device validation and Phase 2 enforcement remain pending. Implementation details and limits: `app-next/src/features/unlock/README.md`. Supersedes decision B19 ("unlock moment is a simple placeholder") and
the PRD's "no takeover, no confetti" earn moment for the two entry-driven unlocks below. Recorded in
`plans/rebuild/00-decisions.md` (B19 revised, B20 new).

Grilled with Johan 2026-09-07. Every decision below is his unless marked *assumed*.

## What this is

Two full-screen unlock ceremonies, entered from a white button inside the Home lock body. Both
reuse one component: a **lock-shaped frame** whose body is a live surface (camera or map), whose
border carries a **progress ring**, and whose shackle **lifts** on success, followed by **confetti**
and a detected message.

| | Treadmill | Gym |
| --- | --- | --- |
| Entry button (Home lock) | **I'm using a treadmill** | **I'm at the gym** |
| Applies to | Walking `state` and `target/minutes` rules whose place includes `treadmill`; duration rules continue counting after the scan | `{ kind: 'event', activity: 'gym' }` and `{ kind: 'target', activity: 'gym' }` |
| Lock body | Front camera preview | Live Apple map, centred on the user |
| Ring means | Gait-scan confidence, auto-starts once gait is seen, ≤5 s | 30 s presence confirmation after tapping **Unlock** |
| Success message | **Exercise detected** | **Location detected at the gym** |
| Subline | Unlocked while you walk | Unlocked until 9 PM (rule window end) |
| Grant | Existing 15-minute propped lease, renewable | Existing arrival credit: rest of window and day (B2) |

Explicitly **not** covered: step-target walking rules, running/biking, outside-only walks. Those keep the
existing Home progress cards and handheld pedometer verification with no ceremony screen.

## 1. Entry from the Home lock

`BlockingScheduleCard` (`app-next/src/design-system/BlockingScheduleCard.tsx`) gains an optional
`action` slot rendered as the last row inside the lock body, replacing the footer status line
(`ProgressCard` in `lock` appearance).

- **When shown.** Only while the rule's window is active and the decision is `locked`. Outside the
  window the row reverts to the existing status text. If both a treadmill-eligible walking rule and
  a gym rule are active, two pills stack, gym first (*assumed*).
- **Look.** Full-width white pill, `radius.pill`, height `layout.button`, label in `type.label`
  coloured `brand.primary`. Leading glyph: `walking` or `gym` icon, `variant="utility"`,
  tint `brand.primary`. Press: `scale.pressed` + `feedback('press')`.
- **Status line.** The former "Your next visit counts · Auto-detect off" moves to `type.support` in
  `text.onAccent` at 80 % opacity, directly under the pill. Lock height must not change from the
  current viewport-fitted geometry.
- **Copy** (add to `src/content/home.ts`): `treadmillEntry: "I'm using a treadmill"`,
  `gymEntry: "I'm at the gym"`.
- **Navigation.** `router.push('/unlock/treadmill?ruleId=…')` and
  `router.push('/unlock/gym?ruleId=…')`. Both are `presentation: 'fullScreenModal'` screens in
  `RootNavigator`, gated by the same entitlement/onboarding guards as `builder`. They replace the
  `walk` and `checkin` sheets in `HomeSheets` for these rule kinds; `WalkingSheet` stays only for
  outdoor state rules until that is folded in later, `CheckInSheet` is deleted.

## 2. Shared component: `UnlockLockFrame`

New file `app-next/src/design-system/UnlockLockFrame.tsx` (≤200 lines; split ring and shackle
animation into siblings).

```
props: {
  surface: ReactNode            // camera preview or map, fills the body
  progress: SharedValue<number> // 0..1, drives the border ring
  phase: 'idle' | 'working' | 'lifted'
  overlay?: ReactNode           // message/button layer above the surface
}
```

**Geometry** matches the Home lock exactly so the screen reads as the same object, enlarged:
body width = screen width − 2·`layout.page`, body `aspectRatio: 1 / 0.67` is **replaced by 1:1**
on these screens (Johan: "the frame is square"), corner radius `bodyWidth * 0.13`, shackle from
`LockShackle` with the same 0.60 / 0.40 / 0.108 ratios. The shackle is rendered above the body
and overlaps by 1 pt as today.

**Body.** The surface is clipped by the rounded rect (`overflow: 'hidden'`). A 6 pt inner border
(`stroke.chart` × 2) in the lock gradient (`welcomeTokens.card.start → end`) frames the surface so
the orange lock silhouette survives a bright camera feed or a pale map.

**Ring.** An SVG rounded-rect path traced on the outer edge of the body, stroke width
`bodyWidth * 0.045`, `strokeLinecap: 'round'`, colour `text.onAccent` over a track of
`brand.lockShade` at 35 % opacity. `strokeDashoffset` is an animated prop bound to `progress`.
The path starts at the top centre and runs clockwise so the ring "closes" under the shackle.
Ticks: every 0.25 of progress fires `feedback('selection')` (skipped under Reduce Motion).

**Shackle lift** (`phase → 'lifted'`):

| Step | Timing | Detail |
| --- | --- | --- |
| Ring completes | 0 ms | Ring flashes to `text.onAccent` 100 % for `duration.fast` |
| Body settle | 0–180 ms | Body scales `1 → 0.97 → 1` (`spring.pop`) |
| Shackle lifts | 180–560 ms | `translateY: -bodyWidth * 0.14`, `rotateZ: -8deg` around the right leg, `easing.enter`; `feedback('success')` once at 180 ms |
| Confetti | 420 ms | Burst from the gap between shackle and body, see §5 |
| Message | 520 ms | Overlay crossfades to the detected message (`popIn`) |
| Done button | 1 500 ms | Orange `PrimaryButton` fades in below the frame |

Reduce Motion: no ring ticks, shackle crossfades from closed to open (`lock` → `lock-open` glyph
semantics), no confetti, message fades in, one success haptic. Same total duration.

## 3. Treadmill screen — `/unlock/treadmill`

Port of the old app's `TreadmillScanScreen` + `TreadmillScanController` +
`TreadmillScanCoordinator` (`app/src/home/treadmill/`) and the native
`excerlock-gait-vision` module, redrawn inside `UnlockLockFrame`. **Detection logic is ported, not
rewritten** (decision B12). This spec changes only the presentation and the auto-start behaviour.

### Layout, top to bottom

1. Close (`×`) top-left, `layout.touch`, `feedback('press')`, stops the scan and the propped session.
2. `UnlockLockFrame` with the **front camera preview** as the surface (`GaitVisionPreview` from
   the module, mirrored, 640×480 at 15 fps as in the treadmill-mode spec). Placed so the shackle top
   sits at 12 % of screen height.
3. Under the frame, `Heading`:
   - idle / propping: **Prop your phone and walk** / "Set it upright facing you. The scan starts on
     its own once you're walking."
   - scanning: **Reading your stride** / "Keep walking. A few seconds."
   - needsFraming: **Can't see you** / "Step into frame."
   - lifted: replaced by the message overlay in the frame.
4. Privacy line, `type.support`, `text.muted`: "Processed on this iPhone. Nothing is recorded or sent."
5. Footer: nothing until lifted, then **Done**. No Start button. (Johan: "scan begins automatically
   once the gait is passing.")

### Behaviour

- **On mount:** start the propped walking session (`runtime.walking.start(rule)` with placement
  `'propped'`), request camera permission if not yet asked (first-time only, never in onboarding),
  start `GaitVisionProvider`. Camera session and pose samples share one `AVCaptureSession`.
- **Auto-start.** The detector runs continuously from mount. `phase: 'idle'` while confidence is 0
  (no strides yet), `phase: 'working'` as soon as the first qualifying stride is counted. The ring
  is bound to `TreadmillScanSnapshot.confidence`. There is no separate 5-second countdown visible to
  the user; the `GAIT_SCAN_TIMEOUT_MS = 5_000` attempt window and the 30-second framing grace
  (`GAIT_FAILURE_GRACE_MS`) stay as built.
- **Verified** (`classification === 'walking' && complete`): camera torn down immediately, session
  advanced via `completeProppedScan()`, frame goes to `'lifted'`, ceremony plays with **Exercise
  detected** / **Unlocked while you walk**. The preview freezes on its last frame under a
  `surface.scrim`-free orange tint at 20 % so the lifted lock still reads as the app, not a camera.
- **Duration target:** verification is stage one, followed by a counting stage with the ring bound to the
  current rule-day minutes divided by the goal. The scan does not lift the shackle or play confetti. Those
  happen only when the duration row becomes `met`; a lease lapse returns to scanning without discarding
  credited minutes.
- **needsFraming:** ring drains to 0 over `duration.standard`, heading swaps, preview stays live.
  On the 30-second grace expiring the session stops and the screen pops back to Home with the
  existing "Walk complete" state; never a silent shield.
- **Permission denied:** frame surface becomes `surface.subtle` with a `LivingIcon name="person"`;
  heading **Camera access is off** / "Keep your phone with you. Walk & Scroll will verify your
  steps instead."; button **Continue with phone in hand** starts the handheld session and dismisses.
  Exact behaviour of `TreadmillScanCoordinator.permissionDenied()`.
- **Backgrounding** during the scan stops the camera (iOS rule) and returns to `'idle'` on
  foreground; the propped session is not stopped.
- **Done:** `router.back()` to Home, which now shows `unlockedWalking` with the lease clock
  ("12:40 until renewal"). The 15-minute lease, pre-expiry notification, handheld hand-off and
  60-second put-down window are unchanged from `docs/specs/treadmill-mode.md`.

### Ports

`WalkingPort` gains nothing new for the state machine. Add a **`GaitPort`** in
`app-next/src/ports/GaitPort.ts` mirroring the old `GaitVisionProvider` seam
(`start`, `stop`, `onSample`) plus `Preview` component and `permission()`; the fake replays
`FixtureGaitVisionProvider` streams. `RuntimeControls` gains
`setGait(value: 'none' | 'walking' | 'still')` so the dev panel and tests can drive the ring.

## 4. Gym screen — `/unlock/gym`

Replaces `CheckInSheet`. Same `UnlockLockFrame`, surface is a `MapView`.

### Layout, top to bottom

1. Close (`×`) top-left.
2. `UnlockLockFrame` with the **map** as surface.
   - `showsUserLocation`, follows the user until they pan.
   - When the user is **inside** the radius of any saved gym: that gym's radius circle (mask +
     ring as in `PickerMap`, colour `brand.primary` at 18 % fill, 1.5 pt ring) and its pin
     (`map-pin` glyph, `brand.primary`) are drawn. Initial region fits the circle
     (`regionForRadius`).
   - When **outside**: no circle, no pin drawn at rest. Map is centred on the user and pannable.
   - Two floating map controls, bottom-right inside the frame, white discs `layout.disc`:
     **Center on me** (`map-pin` glyph, filled when following) and **Center on gym** (`gym` glyph;
     hidden when no gym is saved). Tapping "Center on gym" animates to the nearest saved gym and
     draws its circle and pin for as long as it is in view.
3. Under the frame, `Heading`:
   - inside: **Location detected at the gym** / "You're at {gym name}."
   - outside: **Not at the gym yet** / "You're {distance} from {nearest gym name}." Distance live,
     rounded to 10 m under 1 km, else 0.1 km.
   - confirming (after Unlock): **Confirming you're here** / "Stay put for a moment."
   - lifted: message overlay in the frame.
   - no gym saved: **Save a gym first** / button **Choose a gym** → `/settings/gyms`.
   - location denied: **Location access is off** / "Allow location while using ExcerLock to check
     in." / button **Open Settings**.
4. Footer: **Unlock** white pill (`PrimaryButton` variant white on the canvas, or orange; *assumed*
   orange to match the CTA rule C1) appears only when inside. After tapping, it becomes disabled with
   `loading` while the ring fills. After lift: **Done**.

### Behaviour

- **Presence** from `runtime.gym.observePresence` plus a foreground location sample on mount
  (`currentLocation(true)`) so the first render is correct without waiting for a geofence event.
  With more than one gym inside range (overlapping radii), the nearest wins.
- **Unlock tap:** `runtime.gym.checkIn(gymId)`, ring animates 0 → 1 over **30 000 ms** linear
  (the app-fixed presence cooldown). Shields are already lifted by instant-relief; this ring is the
  reward booking. If presence flips to `outside` during the 30 s the ring drains, heading returns to
  outside copy, button hidden; no partial credit.
- **Lifted:** **Location detected at the gym** / **Unlocked until {window end}** for event rules,
  or **Your gym time is counting** for time-target rules (arrival credit only starts the clock).
- **Done:** back to Home showing `unlockedMet` for event rules.
- **Auto-detect on and arrival already credited in the background:** opening this screen shows the
  lifted state directly with the message, no ring, no confetti (*assumed*; the Home in-place moment
  already played). Johan can flip this to a full replay later.

### Ports

`GymPort` gains `distanceTo(placeId): number | null` (metres, from the last sample) and
`observeLocation(cb)` for the live dot; `RuntimeControls.setPresence` already exists for tests.

## 5. Confetti

Hand-built with Reanimated + SVG, no new dependency (C5). File
`app-next/src/motion/Confetti.tsx`.

- 40 pieces, three shapes (rect 6×10, circle r 4, strip 3×14), colours `brand.lockHighlight`,
  `brand.decorative`, `brand.light`, `text.onAccent`, `icon.yellow`.
- Origin: the shackle gap (centre-top of the body). Initial velocity 600–900 pt/s in a 110° fan
  upward, gravity 1 400 pt/s², drag 0.985 per frame, individual spin 180–720°/s, fade out from
  1 200 ms to 1 800 ms. Total life 1 800 ms, then unmounted.
- One shared `useFrameCallback` drives all pieces; no per-piece timers.
- Reduce Motion: not rendered.
- Reusable by the Home in-place moment later if Johan wants it there too; not wired in this spec.

## 6. Copy (add to `src/content/unlock.ts`)

```
treadmill: {
  prop: 'Prop your phone and walk',
  propBody: "Set it upright facing you. The scan starts on its own once you're walking.",
  scanning: 'Reading your stride', scanningBody: 'Keep walking. A few seconds.',
  framing: "Can't see you", framingBody: 'Step into frame.',
  privacy: 'Processed on this iPhone. Nothing is recorded or sent.',
  denied: 'Camera access is off',
  deniedBody: 'Keep your phone with you. Walk & Scroll will verify your steps instead.',
  handheld: 'Continue with phone in hand',
  detected: 'Exercise detected', detectedBody: 'Unlocked while you walk',
}
gym: {
  inside: 'Location detected at the gym', insideBody: (gym) => `You're at ${gym}.`,
  outside: 'Not at the gym yet', outsideBody: (d, gym) => `You're ${d} from ${gym}.`,
  confirming: "Confirming you're here", confirmingBody: 'Stay put for a moment.',
  unlock: 'Unlock', centerMe: 'Center on me', centerGym: 'Center on gym',
  detected: 'Location detected at the gym',
  detectedUntil: (end) => `Unlocked until ${end}`, detectedTime: 'Your gym time is counting',
  noGym: 'Save a gym first', chooseGym: 'Choose a gym',
  denied: 'Location access is off', deniedBody: 'Allow location while using ExcerLock to check in.',
  openSettings: 'Open Settings',
}
done: 'Done'
```

## 7. Accessibility

- Ring: `accessibilityRole="progressbar"`, value 0–100, label "Scan progress" / "Presence check".
- Success announces the detected message via `AccessibilityInfo.announceForAccessibility`.
- Camera preview `accessible={false}`; map labelled "Map of your location".
- Dynamic Type XL: headings wrap under the frame, frame width never shrinks below 260 pt; verify in
  the `dynamic-type-xl` scenario.

## 8. Analytics (`AnalyticsPort`)

`unlock_screen_opened {kind}`, `treadmill_scan_started`, `treadmill_scan_verified {ms}`,
`treadmill_scan_failed {reason: framing|denied|timeout}`, `gym_unlock_tapped {distance}`,
`gym_unlock_confirmed`, `gym_unlock_lost`, `unlock_ceremony_done {kind}`.

## 9. Demo / fakes / tests (TDD, Phase 1 build)

- Scenarios: `unlock-treadmill-scan` (gait fixture `real-walk-single` replays, verifies at ~3.5 s),
  `unlock-treadmill-framing` (still fixture, hits needsFraming), `unlock-treadmill-denied`,
  `unlock-gym-inside`, `unlock-gym-outside` (presence outside, 140 m), `unlock-gym-lost`
  (presence flips mid-ring), plus both under `reduce-motion`.
- Tests: `features/unlock/__tests__/treadmill.test.tsx` (auto-start on first stride, ring bound to
  confidence, verified → lifted → Done routes home in `unlockedWalking`, denied path starts
  handheld), `gym.test.tsx` (button only when inside, 30 s ring, lost presence drains, Done routes
  home in `unlockedMet`), `UnlockLockFrame.test.tsx` (ring path length, phase transitions, Reduce
  Motion skips confetti), `Confetti.test.ts` (piece count, unmount at 1 800 ms), and the Home
  router test extended for the two entry pills.
- Evidence: recordings in `app-next/evidence/T-unlock/` per the Phase 1 README motion bar.

## 10. Phase 2 (native)

Port `excerlock-gait-vision` and `excerlock-motion` modules from `app/modules/` unchanged; the
`GaitPort` fake is swapped for `NativeGaitVisionProvider`. Real geofence presence via `GymPort`.
Device validation items from ticket #113 (preview framing, Vision throughput, front-camera
orientation) remain open and block the treadmill screen from shipping to TestFlight.

## 11. Open items

- Whether the Home in-place unlock (auto-detect, background) should replay the confetti ceremony on
  next foreground. Assumed no for now.
- Whether "I'm using a treadmill" should also appear for `place: 'either'` rules. Assumed yes.
- Unlock button colour on the gym screen (white per Johan's sketch vs orange per C1). Assumed orange
  on the canvas, white pills only inside the orange lock.
