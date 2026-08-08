# ExcerLock UI mock

This is a standalone, looks-only Expo SDK 57 iOS prototype for ExcerLock. It is
fully tappable, but every permission, purchase, account, workout, location,
notification, app-locking, and sharing result is deterministic local demo
state. It does not contact a backend or change anything outside the app.

## Run it

Requirements: Node.js 22.13.0 or newer, npm, Xcode with an iOS Simulator, and
the Expo CLI provided by this project.

```sh
npm ci
npm run ios -- --device "ExcerLock-Demo"
```

`npm run ios` invokes `expo run:ios`: it builds, installs, and launches the
app-specific **ExcerLock UI Mock** development binary and starts Metro. Replace
the simulator name with another name or UDID as needed. Do not start a second
Metro process while that command is serving the app.

For a later JS-only session with the native binary already installed, start
Metro in development-build mode, then open **ExcerLock UI Mock** in the
Simulator:

```sh
npx expo start --dev-client
```

For a split native-build/Metro workflow, use
`npx expo run:ios --device <UDID> --no-bundler`, then start
`npx expo start --dev-client` on a free port. Plain
`npm start` plus `i` may choose Expo Go, so it is not the app-specific native
acceptance path. The app starts at the first onboarding screen and continues
through the simulated paywall and signup into an empty Home.

## Verify it

```sh
npm run typecheck
npm test -- --runInBand
npx expo-doctor
npx expo install --check
QA_EXPORT_DIR="$(mktemp -d /tmp/excer-ui-mock-export.XXXXXX)"
npx expo export --platform ios --output-dir "$QA_EXPORT_DIR"
```

The rendered Router suites exercise the first-run flow, all four tabs, the
condition builder, debug-state reachability, transactional app selection,
paywall/restore, Settings, and all three notification-entry destinations.
Reducer and component suites cover presentation transitions, Home, sessions,
Analysis, Manage, content, and the event/state/rate card seam.

The frozen 2026-08-07 acceptance run passed TypeScript, **32 Jest suites / 261
tests**, Expo Doctor **20/20**, and `expo install --check` with dependencies up
to date. The iOS static export bundled 1,759 modules and 102 assets into one
4.3 MB Hermes bytecode bundle (104 files / 71 MB total). Run the commands above
again after any change.

## Native and manual acceptance evidence

The Expo SDK 57 app-specific iOS build was compiled, installed, and launched on
the `ExcerLock-Demo` iOS 26.4 Simulator with:

```sh
npx expo run:ios --device A5ACC85F-6CB2-45BF-BA66-FD6F36E69801 --no-bundler
npx expo start --dev-client --port 8090
```

The build completed with zero errors and two warnings, installed bundle
`com.johansardar.excerlock.uimock`, and loaded the explicit Metro bundle at
`127.0.0.1:8090`; port 8090 was used only because 8081 was occupied. Launch OCR
found the expected ExcerLock copy and no red-box signature.

Representative simulator captures are retained as working QA evidence under
`/Users/johansardar/ExcerLock/work/runtime-qa`:

- `native-onboarding.png` — onboarding value screen.
- `native-paywall-annual.png` — annual plan, trial timeline, and paywall hero.
- `native-home-showcase.png` — populated Home and four-tab shell.
- `native-builder-catalog.png` — builder catalog, filters, and conflict states.
- `native-analysis-showcase.png` — empty Analysis state (the filename predates that clarification).
- `native-debug-controller.png` — the grouped hidden Demo states controller.

These are representative manual checks, not a 98-screen golden set and not a
claim that every `DESIGN ID` has an individual capture. Automated rendered
tests, static export, source inspection, and representative native QA remain
distinct evidence types in `DESIGN.md` section 18.

## Project map

- `src/app` — 31 thin product-route adapters, two layout files, and modal presentation.
- `src/presentation` — the single deterministic state machine and selectors.
- `src/features` — screen composition by product area.
- `src/design-system` — Pillow-derived tokens, components, motion, and charts.
- `src/content` — product copy, fixtures, condition catalog, and runtime assets.
- `assets` — standalone runtime visuals and their foundry manifests.
- `DESIGN.md` — the 98-ID interaction matrix and implementation-evidence ledger.
- `docs/ARCHITECTURE.md` — module boundaries, approved seams, and route map.
- `docs/DESIGN_SYSTEM.md` — exact visual, component, state, and accessibility contracts.
- `docs/PILLOW_SYNTHESIS.md` and `docs/PILLOW_*.md` — the complete 262-screen design audit.

Each deep module has a local `README.md` describing its public interface and
ownership boundary.

## Demo-state controls

The normal first run deliberately lands on Home with zero conditions. Add the
first condition from Home or Manage. To inspect alternate states without
changing the product flow, tap the Settings footer seven times to open the
hidden Debug controller. It can seed the event/state/rate showcase and expose
every required Home mode; all Walk/Gym phases; empty, populated, and new-badge
Analysis; permission, subscription, identity, purchase, and signup states;
every review-trigger/lifecycle combination; all notification entry states; and
all four shield variants. **Reset all** requires confirmation and returns to
the launch resolver.

## Expo MCP guidance

Expo MCP was authorized and consulted for the SDK 57 Router, test, and native-
surface decisions used by this looks-only build. The resulting local guidance
and the boundary between Expo APIs and simulated UI are recorded in
`docs/EXPO_MCP_GUIDANCE.md`; an MCP connection is not required to run the app.

## Intentional prototype seams

- The 98 design states intentionally share 31 stateful product routes (plus two
  Router layouts); visual-state IDs do not require duplicate route files.
- Manage uses explicit **Move**/**Remove** tap actions and confirmation instead
  of drag/swipe. Precision values use transactional choice lists or steppers
  instead of inertial wheels; clock steppers move one minute at a time, so any
  clock time remains representable.
- Branded local sheets use `AccessibleModal` instead of native form-sheet APIs.
  A zero-gym builder state exposes **Add sample gym** as its deterministic
  recovery rather than manufacturing a selected place.
- Runtime condition banners follow the user-approved GPT Image 2 override; the
  accepted replacement and all 21 banner records are in
  `assets/banners/FOUNDRY.md`.

These accepted looks-only deviations are not missing callbacks. Every
permission, purchase, account, workout, location, notification, share, and
app-lock surface is simulated locally; no real service API is invoked.

## Safety boundary

This prototype never requests Screen Time, Motion, Health, Location, Photos, or
Notification permission; never reads installed apps or health/location data;
never blocks apps; never charges a purchase; never creates an account; and
never sends analytics, support messages, notifications, or shares. Native-like
surfaces are visibly labeled prototype previews and only mutate in-memory
state. The sole physical-feedback exception is one local light haptic during
the Home closed-to-open earn transition when Haptics is enabled. No other
prototype action emits haptics, sound, notifications, or external effects.
