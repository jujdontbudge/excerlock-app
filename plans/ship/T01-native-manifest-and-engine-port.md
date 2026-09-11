# T01 — Binary #1: native manifest and engine port

Spec: `02-native-manifest.md`. Facts: `research/native-inventory.md` §1–§9. Port, don't rewrite (B12).

## Facts

- `app-next` has two native modules (gait-vision, local-search), one plugin (camera string), one target, no
  entitlements, no `UIBackgroundModes`. `app/` has everything else.
- Old plugins: `withNoPush.js` (delete — B50 keeps push), `withHealthKitBackgroundBootstrap.js` (keep),
  `withScreenTimeExtensionValidation.js` (keep, extend to 5 targets, stays first-listed).
- `react-native-device-activity` 0.6.1 generates 3 appex from its `targets/`; the `.report` appex is new.

## Steps

1. Copy across, with tests and READMEs: `app/modules/excerlock-motion`, `app/plugins/{withHealthKitBackgroundBootstrap.js,healthkit/,withScreenTimeExtensionValidation.js}`,
   `app/targets/*`, `app/patches/*`, `app/src/screentime/native/*`, `app/src/engine/{signals,walking,gym}/`
   (adapters are wired in T11 — here they only compile), `app/scripts/verify-*`, `guardrails/plugin-order.test.ts`.
   Do **not** copy vendor integrations, the ledger, Clerk, or the time-bank engine.
2. Add every dependency in `02-native-manifest.md` §1 rows 9–31 to `app-next/package.json` at the versions
   pinned in `app/package.json`; `patch-package` postinstall for HealthKit.
3. Write `plugins/withMainAppEntitlements.js`: asserts every app-target build configuration's
   `CODE_SIGN_ENTITLEMENTS` points at `ios/ExcerLock/ExcerLock.entitlements` (ledger: stale/`undefined.entitlements`
   ships an executable without its capabilities). Fails prebuild otherwise.
4. Extend the validator to the `.report` target; add a fifth target definition for App Intents (empty intent).
5. `app.json` → `app.config.ts` shell (T02 fills secrets): full `ios` block per §1 — every usage string set
   **only** in its plugin, `UIBackgroundModes`, `CFBundleAlternateIcons`, `CFBundleLocalizations`, `entitlements`
   with Family Controls, HealthKit ×2, App Groups, `applesignin`, `aps-environment`, associated domains.
6. `PrivacyInfo.xcprivacy`: collected data types for PostHog, Sentry, Adapty, Supabase; required-reason APIs
   (UserDefaults, file timestamps, system boot time, disk space) with reasons.
7. Plugin array in the §2 order; `plugin-order.test.ts` asserts it and asserts `withNoPush` is absent.
8. `scripts/verify-binary.sh` implementing §3 steps 1–5 and 7; wire into CI on the `preview` profile.

## Tests first

- `guardrails/plugin-order.test.ts` (validator first-listed, no `withNoPush`).
- `guardrails/entitlements.test.ts`: parses the generated `ios/` after prebuild; asserts main + 5 appex
  entitlement sets exactly.
- `guardrails/infoplist.test.ts`: every §1 plist key present once.

## Acceptance

- [ ] `npx expo prebuild --clean` twice → identical `ios/` (diff empty).
- [ ] `eas build -p ios --profile preview` signs; `scripts/verify-binary.sh` passes on the IPA (main + 5 appex).
- [ ] Dev client launches on the simulator; harness app root boots; no module reports missing native.
- [ ] `evidence/T01/`: codesign dumps, plist dump, privacy manifest, verify script output.
