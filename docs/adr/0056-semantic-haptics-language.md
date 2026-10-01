---
status: proposed
date: 2026-09-26
---

# 0056: One semantic haptics language in `ui/haptics`

## Decision

Every haptic in the app goes through `app-next/src/packages/ui/haptics.ts` and names an intent, never an
`expo-haptics` call:

| Intent | iOS effect | Use |
|---|---|---|
| `detent` | selection | a meaningful mark while dragging: a whole pound, an hour on the schedule dial, a goal row on the minutes wheel, a chart point |
| `select` | selection | a choice that actually changed: radio, checkbox, segment, tab, day |
| `tap` | light impact | a meaningful button action, a pin landing, a slider endpoint |
| `beat` | soft impact | one sober narrative beat in onboarding |
| `lock` | rigid impact | apps lock: the loop story, the Condition demo, resuming a Condition that locks now |
| `commit` | medium impact | an actual save: a Condition, a plan, a gym, a pause or resume, a delete |
| `warning`, `success`, `error` | notification | a resolved outcome that is known, never a pending one |
| `unlock` | rigid impact, then success 130 ms later | a real locked to unlocked transition (Home, gym check-in, treadmill scan) and its demo |

Shared controls take a `haptic` prop (`HapticIntent`, including `'none'`), so a screen can move the cue to its
confirmed result. Choice controls send `select` only when the value changes.

## Context

Before this, `feedback()` had four raw kinds. Every `PressableScale` sent a selection tick, even on the tab or
segment already selected. Screens added their own success pulses on top. The Condition demo pulsed success on
every auto-loop. The persisted `settings.haptics` preference was never applied. The product wants rich
haptics that feel deliberate, following Apple's HIG: match the event, stay restrained, and never make the haptic
the only signal.

The alternatives were per-screen `expo-haptics` calls or a native pattern engine (Core Haptics AHAP). Per-screen
calls caused the drift this ADR replaces. Core Haptics needs native code, which would mean a new runtime version,
so it cannot ship over the air. Every intent above uses APIs already in the runtime 4 binary.

## Consequences

- **One tick at most.** Calls made in the same JavaScript tick are merged, and the strongest intent plays. A
  button's `tap` followed by its handler's `commit` is felt once. A `success` that is confirmed later, after an
  `await`, still plays after the earlier `tap`.
- **Rate limits.** Each intent has a minimum gap. For 120 ms after a strong intent (`commit` or above), weaker
  intents are dropped.
- **Silence.** Nothing plays while the app is not active. Backgrounding, or turning the preference off, cancels
  every scheduled beat. `settingsStore` pushes `haptics` into the module on hydration, on every patch and on
  reset.
- **Reduce Motion** is separate from the haptics opt-out. It turns `unlock` into a single success and collapses
  timed onboarding sequences to one state cue.
- **Home follows the shield.** In the real runtime, Home plays `unlock` when the runtime counts a Condition shield
  lift in `RuntimeStatusSnapshot.shieldLifts`. The runtime counts one after `EnforcementHost` reports
  `'applied'` for a move from `shield` to `open` after a target is Met or to gym `conditional` (`isConditionShieldLift`). That
  means the native `unshield(revision)` call returned success. It is an acknowledgement, not a read of what iOS
  is displaying: JavaScript has no API to read the live ManagedSettings shield state, and adding one needs a new
  native method and binary.
- **What never pulses.** Boot applies (no previous policy), lifts applied on a `foreground` wake, and lifts
  counted while Home is unfocused are consumed silently. Home also waits 1.5 s after mount or return to the
  foreground. The demo runtime has no shields, so Home falls back to the Lock decision there.
- **One signature per unlock.** `unlock` has a 5 s minimum gap. The gym or treadmill ceremony and Home can
  never both play for one unlock.
- **Evidence.** A debug log of intents (kind and time only) feeds the dev menu's "Haptics log", which gives
  simulator evidence. Perceived strength still needs a physical iPhone.
- **iOS still decides.** It suppresses haptics while the camera records, in Low Power Mode on some devices, and
  when System Haptics is off. The UI must read correctly without them.
- **Switches.** Native `Switch` rows no longer add an app haptic, because `UISwitch` plays its own.

## References

- `app-next/src/packages/ui/haptics.ts`, `app-next/src/packages/preferences/settingsStore.ts`,
  `app-next/src/packages/settings/PreferencesScreen.tsx`.
- `app-next/src/packages/onboarding/lib/condition-demo/demoHaptics.ts`.
- Apple Human Interface Guidelines, Playing haptics.
