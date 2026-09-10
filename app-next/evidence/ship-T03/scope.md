# T03 scope + limits

Owned and changed here:

- `app-next/src/runtime/updates.ts` — single `expo-updates` owner, DI coordinator + `useOtaCoordinator` hook.
- `app-next/src/runtime/__tests__/updates.test.ts` — 38 coordinator tests.
- `app-next/src/runtime/__tests__/updates-import-boundary.test.ts` — one-owner + modern-calls + no paywall-gated imports.
- `app-next/scripts/verify-ota.sh` — §5 steps 2–3 verifier (paginated numeric newest, Expo.plist runtime, `expo-v11.db` proof).
- `docs/agents/operations.md` — OTA mount contract, release ritual, runtime-bump procedure.
- `app-next/evidence/ship-T03/` — this evidence (md/json only per `.gitignore`).

Root-owned, intentionally untouched:

- `app.json` (`updates.enabled=false`, no `runtimeVersion`), `eas.json`, dependency manifests (`expo-updates` resolves via shared `node_modules`; root must declare it), `createRuntime`, root mounting (`_layout.tsx`/`RootNavigator`).
- Sentry `release`/`dist` + PostHog super-properties wiring (T06): coordinator exposes `getOtaObservabilityContext()`; not wired here.
- Code signing: Expo Free — conditional requirement not enabled. No keys created, no tamper verification claimed.

Limits (not passes):

- No simulator/device use in this task. Airplane fresh-install < 3.5 s, App Store + TestFlight `expo-v11.db` activation, and tamper-manifest proof (signing-enabled only) remain T00/T16 gates.
- Missing physical artifact exits 2 as `RUNTIME LIMIT`, never PASS.
