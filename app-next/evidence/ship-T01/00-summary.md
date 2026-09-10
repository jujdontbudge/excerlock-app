# T01 evidence — native manifest and engine port (branch ship/T01)

Worktree: `/Users/johansardar/ExcerLock-build/ship-T01`, branch `ship/T01`.
Executor: Muse Spark xhigh, supervised by root. No questions, no subagents,
no simulator boot/use, no EAS build/upload/push/deploy, no service changes.

## What was ported (verbatim, B12 port-don't-rewrite)

- `app/modules/excerlock-motion` → `app-next/modules/excerlock-motion` (byte copy).
- `app/plugins/withHealthKitBackgroundBootstrap.js` + `healthkit/HealthKitBackgroundBootstrap.mm` → `app-next/plugins/` (byte copy).
- `app/plugins/withScreenTimeExtensionValidation.js` → `app-next/plugins/` (kept, extended: see below).
- `app/targets/{DeviceActivityMonitorExtension,ShieldAction,ShieldConfiguration}` → `app-next/targets/` (byte copy incl. images, FOUNDRY.md, ShieldContent).
- `app/patches/@kingstinct+react-native-healthkit+14.0.2.patch` → `app-next/patches/` (byte-identical; root postinstall already applies the same patch from `app/patches`, verified by diff).
- `app/src/screentime/native/*` + type siblings `ScreenTimeModule.ts`, `selectionSummary.ts`, `shieldState.ts`, `mockStore.ts` → `app-next/src/screentime/` (byte copy). Ledger-era fakes/composition (`Mock*`, `accessor`, `appRuntime`, `clock`, `index`) deliberately NOT ported. `@excerlock/ledger` imports resolve to the existing workspace package (referenced, never copied).
- `app/src/signals/{gait,health,location,motion,placement,timeline}` + `fixtureCatalog` + `nativeIosRuntime` → `app-next/src/engine/signals/` + `app-next/src/engine/nativeIosRuntime.ts`. Excluded per T01: `signals/screentime` fixtures, `signals/vendor`. Three mechanical import fixes only: `location/accessor.ts` `@/runtime` → `../../nativeIosRuntime`, motion/gait/placement module `require("../../../modules/…")` → `"../../../../modules/…"`, `fixtureCatalog`/`index` rewritten to the 4 ported domains.
- `app-next/src/engine/walking/` (motion+placement provider selection, 2 tests) and `app-next/src/engine/gym/` (README + stub index; path lives in `signals/location`) are compile-only; T11 wires adapters.

## New files owned by T01

- `app-next/plugins/withMainAppEntitlements.js` (finalized mod; fails prebuild unless every app-target config points at `ExcerLock/ExcerLock.entitlements`).
- `app-next/plugins/withPrivacyManifest.js` + `app-next/privacy/PrivacyInfo.xcprivacy` (non-empty collected types for PostHog/Sentry/Adapty/Supabase; UserDefaults/FileTimestamp/BootTime/DiskSpace reasons; Tracking=false).
- `app-next/targets/DeviceActivityReportExtension/` + `app-next/targets/app-intents/{EmptyIntent.swift,Info.plist,expo-target.config.pending.js}` (pending definitions, no Xcode appex).
- `app-next/config/native.ts` exporting `nativeConfig` (`ios` + `plugins`) for root `app.config.ts` to merge; no secrets, no EAS/updates config.
- `app-next/guardrails/{plugin-order,entitlements,infoplist}.test.ts` (9 tests).
- `app-next/scripts/verify-binary.sh` (§3 steps 1–5 prebuild + 7 determinism framing; binary steps need an IPA).

## Decisions forced by evidence (all honest, none silent)

1. `withNoPush` deleted and absent (B50 keeps push; `aps-environment` expected from `expo-notifications`).
2. Report appex pending: bundle `com.johansardar.excerlock.report` exists in ASC with Family Controls approval, but RNDA 0.6.1 / apple-targets 0.1.19 expose no `device-activity-report` target type — generating one from a wrong type would sign an invalid extension. Preserved as `expo-target.config.pending.js` + stub Swift + correct report Info.plist.
3. App Intents pending: empty intent, App Groups only, explicitly NO Family Controls (`/Users/johansardar/.local/state/excerlock-ship/tasks/T01-architecture.md` absent; Astra review pending).
4. Validator port adaptation: the old classic-`getPbxproj` disk read cannot see Beta-model targets on clean prebuilds (verified: it failed; old `app/ios` never existed to prove otherwise). The validator now asserts Beta in-memory targets + `generated.entitlements` file contents (written pre-finalized) + pending definitions. Post-prebuild wiring is asserted by `entitlements.test.ts` parsing the WRITTEN `project.pbxproj`.
5. `copyToTargetFolder:false` restored on the RNDA plugin (dropped in the first draft by mistake; the copy created a stale `targets/ActivityMonitorExtension` + a 4th Xcode target and overwrote our configs — found, cleaned, restored verbatim, guarded).
6. `expo-network` deferred: in 02 §1 row 31 but absent from `app/package.json` (no pinned version), not installed, imported by no T01 code. Everything else in rows 9–31 added at old pins with zero downgrades.
7. `aps-environment` value `development` covers dev-client truth; preview/production environment mapping is T02/EAS territory. The verifier tolerates either value on a signed binary but requires presence.

## Ownership respected

Untouched: root `app.config.ts` (does not exist; only `config/native.ts` provided), `eas.json`, vendor config/env scripts, `src/runtime/createRuntime`, root app wiring, all `app-next` domain/feature source (2 full-suite failures are in unmodified `demo`/`design-system` files — pre-existing, T07/T09 territory; proof in tests.md).
