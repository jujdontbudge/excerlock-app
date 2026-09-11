# 03 — OTA and release (B49)

Owned by T03 (config, coordinator, gates) and T16 (release ritual). Every rule here maps to a Recovi
incident in `research/recovery-postmortem.md` §"OTA" or the ledger's OTA section.

## 1. Configuration (verbatim targets)

`app.config.ts`:
```ts
runtimeVersion: '1',                       // manual. Bump ONLY when native code changes. Never appVersion, never fingerprint.
updates: {
  url: 'https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2',
  enabled: true,
  checkAutomatically: 'ON_LOAD',           // never ON_ERROR_RECOVERY (Recovi: native check never ran on a healthy launch)
  fallbackToCacheTimeout: 3000,            // bounded first-session gate; embedded bundle wins on expiry
  codeSigningCertificate: './certs/update-signing.pem',   // if the EAS plan allows; private key never in git
  codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
},
```
`eas.json`:
```json
{ "cli": { "appVersionSource": "local" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "channel": "development" },
    "preview":     { "distribution": "internal", "channel": "preview" },
    "production":  { "channel": "production", "autoIncrement": "buildNumber" } },
  "submit": { "production": { "ios": { "appleTeamId": "AX3C2B78YD", "ascAppId": "6787265352" } } } }
```
`appVersionSource: local` — Recovi's `remote` + `autoIncrement` made the local `app.json` lie about which
version was public. Version bumps never change `runtimeVersion`.

## 2. One coordinator

- Exactly one module, `src/runtime/updates.ts`, owns every `expo-updates` call. Two coordinators `SIGSEGV`'d
  Recovi build 41 during reload.
- It mounts at the app root (T10's runtime root), **above** the entitlement and onboarding guards. It is
  never gated on `onboardingComplete`, entitlement, or anything else behind the paywall (Recovi: unpaid users
  could never receive a fix).
- First session: `ON_LOAD` handles check+download natively within `fallbackToCacheTimeout`. The JS coordinator
  then only observes `useUpdates()`; it never runs a second check on the same launch.
- Subsequent sessions: on foreground after ≥ 6 h in background, `checkForUpdateAsync` → `fetchUpdateAsync`, then
  apply at the next **safe boundary** (§3). Check and download each get their own budget; never one shared
  budget.
- Reload-loop guard: persist `{ updateId, launchCount }`; if the same update id has reloaded twice without a
  successful launch, stop trying and report to Sentry.

## 3. Safe reload boundaries

`reloadAsync` is called only from the coordinator, only when **all** are true: no purchase or restore in
flight (`SubscriptionPort.busy === false`), no permission prompt pending, no camera scan running, no
`unlockedWalking`/`unlockedPropped` state, the app is in the foreground, and the user is on a tab root (not
inside onboarding, the builder, or a ceremony). Otherwise defer to the next foreground. Persist a
`resumeEnvelope` (route + draft ids) before reloading.

## 4. Observability

- Sentry `release` = `com.johansardar.excerlock@<version>+<build>`, `dist` = `<runtimeVersion>-<updateId>`.
  Sourcemaps uploaded for every `eas update` (`npx sentry-expo-upload-sourcemaps dist`) and every build.
- PostHog super-property `update_id` and `runtime_version` on every event, registered after every reset.

## 5. Release ritual (gate for T16; script `scripts/verify-ota.sh`)

1. `eas update --branch production --message "<sha>"` only from a tagged commit on `main` after CI is green.
2. Determine the **numerically newest READY_FOR_SALE version** from all paginated ASC versions (never from local
   `app.json`), resolve its attached build, and read that build's embedded `runtimeVersion` from its
   `Expo.plist`. Publish only to that runtime. Fail if the intended runtime differs.
3. On a physical phone: delete the app, install from the public App Store (and separately from TestFlight),
   launch twice, then pull `Library/Application Support/.expo-internal/expo-v11.db` and assert the intended
   `update_id` is present with `successful_launch_count > 0`. Both installs. Fail the release otherwise.
4. Prove a tampered manifest is rejected by the release binary once per certificate (code signing).
5. Record all of it in `evidence/release-<version>/`.

## 6. Bumping `runtimeVersion`

Only when `02-native-manifest.md` changes or a native dependency's iOS code changes. Procedure: bump the string,
build, submit, wait for Ready for Sale, then publish JS to both the old and the new runtime until the old
runtime's 30-day active-install share is under 5 %. Never orphan a runtime that still has installs.
