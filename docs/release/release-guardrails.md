# Release guardrails

What a store build of the new app must never contain, and the test that proves it. All of them run in
`npm run test:release-guardrails` (`guardrails/release/`, under 1 s, no prebuild) and as the first CI step
after `npm ci`. They resolve the release app as `app-next/` until the rename and `app/` after it.

| Guardrail | Rule | Test |
| --- | --- | --- |
| No dev route | `app/dev.tsx` is registered only inside `<Stack.Protected guard={devMenuEnabled}>`; `devMenuEnabled` is exactly `__DEV__ \|\| process.env.EXPO_PUBLIC_DEV_MENU === '1'`; no other file reads that variable. | `dev-surface.test.ts` (static) + `app-next/src/features/dev/__tests__/dev-guard.test.tsx` (renders the navigator with the flag off; `/dev` resolves to nothing) |
| No deep-link runtime mutation | `useDemoProgress` returns before touching runtime controls when the flag is off, so `excerlock://home?steps=…&advance=…&presence=…` is inert. | `dev-surface.test.ts` + `dev-guard.test.tsx` |
| No seven-tap entry | The Settings footer ignores taps when the flag is off. | `dev-surface.test.ts` + `dev-guard.test.tsx` |
| No test buttons | No production source contains "Test gym unlock" / "Test treadmill unlock". | `dev-surface.test.ts` + `home-router.test.tsx` |
| Dev flag off in store builds | `eas.json` `preview` and `production` never set `EXPO_PUBLIC_DEV_MENU=1` or `EXPO_PUBLIC_E2E=1`. | `eas-profiles.test.ts` |
| No E2E surface | No production source references `screen-e2e-error` or `EXPO_PUBLIC_E2E`; no `e2e` EAS profile. | `dev-surface.test.ts`, `eas-profiles.test.ts` |
| No `aps-environment` | `./plugins/withNoPush` is first in `app.json` plugins (Expo applies plugins last-in-first-out, so it strips the entitlement `expo-notifications` writes); `app.json` declares no `aps-environment` entitlement or `remote-notification` background mode; a generated `ios/` project has no `aps-environment` in any `.entitlements`. | `no-push.test.ts` (the native check runs only when `ios/` exists, i.e. after `prebuild:guardrails`) |
| Coverage floor | `jest.config.js` keeps `./src/domain/` at 100 % branches; the app's `test` script runs with `--coverage`; root `test:unit` runs the app first; CI runs `test:unit`, `test:release-guardrails` and `test:guardrails` on push and pull request. | `coverage-floor.test.ts` |
| One identity | Bundle id, team, slug, scheme, owner, EAS project and updates URL equal decision A3, equal the old app while it exists, no other app group, no local `buildNumber`, marketing version ≥ 1.0.0 and equal in `app.json` and `package.json`. | `identity.test.ts` |
| Store-submittable profiles | `preview` and `production` are store distribution, signed, not dev clients, not simulator, `autoIncrement: true`, `appVersionSource: remote`; submit profiles bind to ASC app `6787265352` and team `AX3C2B78YD`. | `eas-profiles.test.ts` |
| Privacy label matches code | Every `analytics.track('…')` event is listed in `app-next/release/app-privacy.json`; every evidence path exists; `tracking` is false everywhere. | `privacy-manifest.test.ts` |
| Workspace | Root workspaces include the release app; `test:release-guardrails` script exists. After the rename: `app-next/`, `excer-ui-mock/`, `packages/ledger`, `packages/condition-model`, `e2e/flows`, `.maestro/`, `scripts/e2e-loop.sh` are gone; `test:app-next` and `test:e2e-contract` are gone; `ARCHITECTURE.md` names `old-app-final`. | `workspace.test.ts` |

## Guardrails owned by other tasks, listed here so the release gate is complete

| Rule | Owner |
| --- | --- |
| Legal documents carry no placeholder marker in a production build. | P2-T10 step 7 |
| `PrivacyInfo.xcprivacy` declares the collected data types (same set as the label). | P2-T07 |
| Single analytics emitter; screen names limited to the registry. | P2-T07 (`single-emitter.test.ts` re-pointed) |
| Sentry initialised inside the root error boundary, scrubbed, `sendDefaultPii: false`. | P2-T07 |
| Native targets, plugin order and shield content of the ported engine. | P2-T03 / P2-T04 (old guardrails re-pointed) |

## Running

```sh
npm run test:release-guardrails                # release set only, fast
npm run test:guardrails                        # clean iOS prebuild + every guardrail (release set included)
npm run test --workspace app-next -- dev-guard # the rendered dev-route proof
```
