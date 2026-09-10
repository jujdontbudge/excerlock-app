# T03 — OTA (B49)

Spec: `03-ota-and-release.md` §1–§4, §6. Facts: `research/recovery-postmortem.md` §OTA;
`research/infra-audit.md` §2. Currently: `updates.enabled=false`, no `runtimeVersion`, no `expo-updates`.

## Steps

1. Add `expo-updates`; config block verbatim from §1 (`runtimeVersion: '1'`, `ON_LOAD`, 3000 ms fallback,
   code signing if T00 step 6 delivered a certificate).
2. `src/runtime/updates.ts` — the single coordinator per §2: observes `useUpdates()`, foreground-after-6h
   check→fetch with separate budgets, safe-boundary reload (§3) reading `SubscriptionPort.busy`, permission
   pending, camera active, detection state, route; `resumeEnvelope` persistence; reload-loop guard.
3. Mount at the runtime root (T10) above every guard. Grep test: no other file imports `expo-updates`.
4. Sentry `release`/`dist` and PostHog super-properties per §4.
5. `scripts/verify-ota.sh` implementing §5 steps 2–3 (ASC newest READY_FOR_SALE version → build → runtime;
   device `expo-v11.db` assertion). Used by T16.
6. `docs/agents/operations.md`: add the runtime-bump procedure (§6) and the release ritual.

## Tests first

- `updates.test.ts`: reload refused during purchase / prompt / scan / walking / non-root route; allowed at
  tab root; loop guard stops after two failed activations of one update id; coordinator never reads
  `onboardingComplete` or entitlement (static assertion on imports).

## Acceptance

- [ ] `eas update --branch preview` from a JS-only change reaches a `preview` device install; `expo-v11.db`
      shows the update id with `successful_launch_count > 0`.
- [ ] Airplane mode fresh install launches in < 3.5 s on the embedded bundle.
- [ ] Tampered manifest rejected (if signing enabled) — recorded once in `evidence/T03/`.
