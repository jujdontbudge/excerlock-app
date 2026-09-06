# ExcerLock looks-only app architecture

## Design intent

`excer-ui-mock/` is a standalone Expo Router app. It contains no native
permission requests, backend calls, persistence, or production-domain imports.
Feature screens receive typed values/callbacks and emit a small set of demo
actions. Presentation state owns cross-route product state; route adapters and
feature screens may own temporary picker, confirmation, search, timer, and
overlay drafts that disappear on dismissal. The sole physical-feedback
exception is the one light local haptic on Home's closed-to-open earn
transition; no other route emits haptics, sound, notifications, or external
effects.

## Deep modules

### `src/presentation`

**Interface:** `createDemoState()`, `transitionDemo(state, action)`, and typed
screen-model selectors.

**Depth:** owns all hardcoded app state, onboarding progression, locked/unlocked
and access-holiday state, simulated identity, active session phases, builder
draft, economy/rules values, saved gyms, review lifecycle, notification entry,
local toggles, plan selection, and fake analytics windows. Routes do not contain
production domain logic, but do translate params, timers, and temporary UI
drafts into presentation actions.

### `src/design-system`

**Interface:** tokens plus a compact set of visual primitives:
`GradientScreen`, `PressableScale`, `PillowCard`, `PillButton`, `IconChip`,
`SegmentedControl`, `SwitchRow`, `SettingsRow`, `SheetFrame`, `BottomTabBar`,
`StatusBarMock`, `AccessibleModal`, `HeroLock`, `ConditionCard`, `LiveRing`, and
chart primitives.

**Depth:** owns the Pillow-derived geometry, translucency, typography, safe-area
spacing, press feedback, sheet behavior, and reduced-motion behavior. Screens
compose these interfaces; no screen declares new colors, radii, or button
geometry.

### `src/content`

**Interface:** typed screen copy, condition catalog entries, settings groups,
fake chart values, milestone values, and local image sources.

**Depth:** keeps the product voice and fake data out of route files, makes all
screens auditable, and gives `DESIGN.md` a stable mapping target.

### `src/features/*`

Each feature exposes one screen interface and hides its local composition:

- `onboarding` — central FLOW renderer through allowance/review/done; it never embeds the condition builder.
- `paywall` — plan selection, trial timeline, restore/terms affordances.
- `identity` — required post-purchase simulated signup and signed-out recovery; no Clerk/network calls.
- `home` — zero-condition first state, hero/balance and condition detail sheets,
  notification focus, access holidays, and the aggregate earn transition.
- `condition-builder` — grouped catalog → typed configuration/reward → banner
  → preview → create/edit/delete.
- `sessions` — every Walk and Gym phase, confirmation sheet, diagnostics, and
  summary/recovery path.
- `manage` — condition list, transactional app picker, complete economy Rules,
  weekly/custom days and reward overrides, and saved-gym lifecycle.
- `analysis` — empty/populated overview, multi-series trends, six day-detail
  fixtures, badge shelf, and local share surface.
- `settings` — grouped overview, account/subscription recovery, transactional
  details, support/diagnostics, and complete simulated review lifecycle.
- `notification-entry` — debug-only nudge/recap/last-call previews and exact deep-link mutations.
- `lock-moments` — low-time banner, time-out page, blocked-app surface.

Expo Router files are thin adapters that select a feature screen and configure
stack/modal presentation.

## Approved TDD seams

1. **Presentation transition seam** — public behavior of
   `transitionDemo(state, action)`: completing an event unlocks the hero,
   rest-of-day/set-period and schedule holidays select the correct Home state,
   sessions advance through their phases, Gym Cancel respects ready versus
   verifying, builder save appends condition #1, and Rules values persist
   locally. Custom-day State/Rate Off blocks execution, a fixed Rate override
   changes credited value, the review trigger and permanent automatic
   suppression flag remain independent and deterministic, and settings toggles
   remain local.
2. **Flow seam** — public behavior of `getOnboardingScreen(state)` and
   builder-step navigation: no skipped or unreachable step; onboarding ends at
   done/paywall, purchase requires simulated signup, first Home is empty, and
   the separate builder begins only from Home/Manage Add.
3. **Condition-card seam** — public `ConditionCard` props render the correct
   event/state/rate status and emit the documented action when pressed.
4. **Rendered Router interaction seams** — suites prove onboarding → paywall
   → signup → empty Home → Add → builder → populated Home, all four tabs,
   transactional app selection, paywall restore, Settings interactions,
   phase-specific Gym Cancel, truthful natural-empty Analysis details,
   execution-aware Time Out recovery, and the three exact notification
   destinations.
5. **Debug reachability seam** — rendered tests visit the required fixture rows
   for purchase/signup, Home, all Walk/Gym phases, Analysis, permission,
   subscription, identity, every review trigger/state, notifications, shields,
   and destructive reset confirmation.

The active-tab reselect-to-top listeners and unseen-Analysis milestone dot are
source-inspected **Static** evidence; the current automated tab-bar test covers
icon tint, not those two behaviors.

The automated suites verify reachability and interaction state, not visual
fidelity. The final native pass retained six representative working captures;
it is not a per-ID screenshot suite. `DESIGN.md` keeps rendered tests, static
inspection/export, and representative native QA as separate evidence types.

## Route map · 31 product routes + 2 layouts

```text
app/
  index.tsx                         onboarding entry
  onboarding/[step].tsx            FLOW step adapter
  paywall.tsx
  signup.tsx                        post-purchase + recovery modes
  (tabs)/
    _layout.tsx
    home.tsx
    manage.tsx
    analysis.tsx
    settings.tsx
  condition-builder.tsx             modal SheetFrame
  walk-session.tsx                  full-screen live register
  gym-check-in.tsx                  full-screen live register
  locked-apps.tsx
  manage/rules.tsx
  manage/base-allowance.tsx
  manage/rollover.tsx
  manage/streak-policy.tsx
  saved-gyms.tsx
  gym/[gymId].tsx
  weekly-rules.tsx
  analysis/trend/[metric].tsx
  analysis/day/[date].tsx
  analysis/earning.tsx
  analysis/badge/[badgeId].tsx
  share-achievement.tsx             modal SheetFrame
  lock-moment/[kind].tsx
  settings/[section].tsx
  settings/permission/[permission].tsx
  support/[kind].tsx
  legal/[document].tsx
  notification-preview/[kind].tsx  debug-triggered local preview
  debug.tsx
```

The 98 unique `DESIGN.md` IDs map onto these 31 product-route adapters, two
layout files, and their deep feature owners; multiple visual states
deliberately share a stable route.

## Expo platform decisions

Expo MCP was authorized and consulted for the SDK 57 Router, test, and native-
surface decisions. `EXPO_MCP_GUIDANCE.md` records the resulting local guidance
and the boundary between Expo APIs and simulated surfaces. Expo MCP is design-
time evidence only and is not a runtime dependency.

## Accepted looks-only substitutions

- Condition reorder/delete use explicit tap actions and local confirmations,
  not drag/swipe gestures.
- Bounded precision values use transactional modal choice lists or steppers,
  not inertial wheel pickers. Clock steppers use one-minute increments, so the
  substitution does not reduce the set of representable times.
- Branded local sheets use `AccessibleModal`, not native form-sheet APIs.
- A zero-gym builder state recovers through **Add sample gym**; it does not
  silently invent a selected place.
- The condition-banner library follows the approved GPT Image 2 renderer
  override. Exact lineage and the accepted weights-floor replacement are kept
  in `assets/banners/FOUNDRY.md`.

These substitutions preserve state ownership, cancellation, Done/commit, and
accessibility semantics. They do not waive callback or reachability coverage.

All permission, notification, purchase, account, share, map, health,
app-locking, and workout outcomes are simulated native-shaped local surfaces.
The gated light Home unlock haptic remains the sole physical-feedback
exception.

## Frozen acceptance evidence · 2026-08-07

- TypeScript passed; Jest passed **33 suites / 269 tests**.
- Expo Doctor passed **20/20**; `expo install --check` reported dependencies up
  to date.
- `expo export --platform ios` completed with 1,759 modules, 102 assets, one
  4.3 MB Hermes bytecode bundle, and 104 files / 71 MB total.
- `expo run:ios --device A5ACC85F-6CB2-45BF-BA66-FD6F36E69801 --no-bundler`
  built, installed, and launched the Expo SDK 57 app-specific
  binary on the `ExcerLock-Demo` iOS 26.4 Simulator (zero build errors, two
  warnings; bundle `com.johansardar.excerlock.uimock`). The app loaded the
  explicit Metro endpoint at `127.0.0.1:8090`; OCR found expected app copy and
  no red-box signature.
- Representative captures live in
  `/Users/johansardar/ExcerLock/work/runtime-qa`: onboarding, annual paywall,
  populated Home, builder catalog, empty Analysis, and the grouped Debug
  controller. They are working acceptance artifacts, not per-ID goldens.

For the app-specific run instructions and the reason not to use plain
`npm start` + `i` for native acceptance, see the root `README.md`.

## Visual verification loop

1. Capture each route at an iPhone 17 Pro logical viewport.
2. Compare Home against the approved ExcerLock anchors and the mapped Pillow
   references.
3. Compare each new route against its `DESIGN.md` reference set for hierarchy,
   spacing, card opacity, CTA position, and content density.
4. Fix the shared module when a family-level mismatch repeats; fix the screen
   only when the divergence is product-specific.
