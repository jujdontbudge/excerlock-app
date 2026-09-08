# P2-T07 — PostHog and Sentry (`AnalyticsPort` real adapter, crash reporting)

## Steps

1. Reuse `packages/analytics-events` in `app-next` (workspace dependency). Update:
   - `flow.ts` `FLOW_SCREENS` to the new onboarding ids (O01…O20, branch ids, S1–S4, T1–T4, P, X1–X5) in
     path order; `onboarding_screen_viewed` / `onboarding_answer` unchanged in shape.
   - Remove vendor events; remove `earn_claimed`, `sick_day_override_used`, `milestone_unlocked`,
     `share_card_shared`, `notification_toggled` (no toggles), keep `notification_opened` (trial reminder).
   - Add `rule_met` (owner client, props: activity, mode kind, day-of-week, minutes-into-window bucket — no
     values), `apps_unlocked_rest_of_day`, `walking_session_started/ended` (rename of walk_session_*),
     `setup_permission_result` (permission, result), `sign_in_completed` (provider).
   - README D6: distinct_id = Supabase uid. D8: flags bucket on `$device_id` unchanged.
2. Port `src/analytics/**` (kit, sinks, privacy policy, runtime, flow tracker) and `src/experiments/**`
   (registry; keep `exp-shield-copy-v1` if the shield copy override survives, else drop). `identify(uid)` on
   session start (anonymous too — PostHog `personProfiles: 'identified_only'` still applies; confirm the
   anonymous-uid policy does not explode person counts: identify only on non-anonymous sessions and alias
   the anonymous distinct id at link time. Decide with the PostHog docs and write it in the README).
3. Sentry: port `src/observability/sentry.ts` scrub and init order; plugin org `edge-ix`, project
   `excerlock-mobile`; server unchanged.
4. Guardrails: `single-emitter.test.ts` re-pointed; `client-observability.test.ts` re-pointed.
5. Tests: registry invariants; privacy policy drops undeclared keys; screen names limited to the FlowScreen
   union; identify/reset ordering on sign-in/sign-out/delete.

## Acceptance

- [ ] Events from a simulator session appear in the PostHog project with `app: excerlock` and the expected
      distinct id (check with the PostHog MCP).
- [ ] A forced test crash appears in Sentry `excerlock-mobile` with scrubbed payload.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- Sentry is initialised inside P2-T17's root boundary: `src/features/launch/AppErrorBoundary.tsx` catches
  the render error and calls its `onError(error, info)` prop, which is where `captureException` goes. The
  same file's `RouteErrorBoundary` is what `app/_layout.tsx` exports as Expo Router's `ErrorBoundary`.
- `PrivacyInfo.xcprivacy` declares the data types the SDKs actually collect; the App Privacy label is filled
  from it. A Settings "Share usage analytics" switch calls PostHog opt-out and is honoured before the first
  event (pending Johan's answer in `fix-plan.md`; default on if he keeps it).
- Attach the persisted O06–O09 answers (`ageBand`, `occupation`, `improveFirst`, `mainReason`) as PostHog
  person properties. P2-T23 keeps the currently shipped O06/O07 option lists pending Johan's answer; the
  property names and purpose do not depend on that choice.

## What was built (2026-09-07)

Registry (`packages/analytics-events`):

- `FLOW_SCREENS` is the rail in path order: `O01`–`O20`, the branch (`G1`, `G2`, `R1`, `R2`, `B1`, `B2`,
  `D`, `W1`–`W4`), `S1`–`S4`, `T1`–`T4`, `P`, then `X1`, `X2`, `X3a`, `X3b`, `X4`, `X5`. The setup rail's
  ids are `X3a`/`X3b`, not a single `X3`, because that is what `setupFlow.ts` renders.
  `APP_SCREENS` / `TRACKED_SCREENS` hold the steady-state screens that also report a `$screen` (`Home`
  today), so the funnel insight can step `FLOW_SCREENS` alone while the transport still accepts a real
  screen name instead of silently dropping it.
- Cut as planned: `earn_claimed`, `sick_day_override_used`, `milestone_unlocked`, `share_card_shared`,
  `notification_toggled`, the three `vendor_*` events. `walk_session_*` renamed `walking_session_*`.
- Added as planned: `rule_met`, `apps_unlocked_rest_of_day`, `setup_permission_result`,
  `sign_in_completed`. Also added `src/events/ceremony.ts` for the aha-unlock events `app-next` already
  emits (`unlock_screen_opened`, `unlock_ceremony_done`, `treadmill_scan_*`, `gym_unlock_*`), which the
  registry did not know about and the re-pointed guardrail now checks.
- New: `enumProperties`, a value floor under the existing `transmittedProperties` name allowlist.
  `AnalyticsPort.track()` takes an untyped bag, and the treadmill scan filled `reason` from a caught
  exception's message — a path, a gym name or a bundle id. The floor drops an undeclared value; the call
  site no longer sends one either.

Adapter (`app-next/src/adapters/analytics`): consent read fresh on every emit, the registry check, the
two privacy layers, the screen union, and the identity rule. Step 2's open question is answered in the
adapter README: **identify only a real user id.** Identifying the shared anonymous placeholder would give
every anonymous install one distinct id and would stop PostHog merging that install's history into the
Supabase id at sign-in — which `identify()` does for free while the SDK is still on its own anonymous id.
No manual `alias()` is needed. `personProfiles: 'identified_only'` keeps the anonymous half of the funnel
from creating person records at all.

Sentry (`app-next/src/observability`): `index.ts` is the app entry and initialises before
`expo-router/entry`; the scrub keeps shape plus the React component stack and drops content;
`reportError` is wired into `AppErrorBoundary`'s `onError` and into `RouteErrorBoundary`.

Opt-out: `settings.shareAnalytics` (default on) with a Settings row, read only after the settings store
has hydrated so an opted-out session never sends its first event.

`src/experiments/**` was **not** ported: no experiment reads a flag in `app-next`, and the shield copy
override does not exist in the rebuild. `preloadFeatureFlags` and `sendFeatureFlagEvent` stay on, so the
registry can be added back without touching the adapter.

### Not in this task

- Call sites for `rule_met`, `apps_unlocked_rest_of_day`, `walking_session_started/ended`,
  `setup_permission_result` and `sign_in_completed`. The events are registered and typed; the engine
  (P2-T14/T15/T16), the setup rail (P2-T23) and sign-in (P2-T01) own their emission.
- The "Export my data" row from `fix-plan.md` open question 3 — Settings and account wiring (P2-T10).
- `PrivacyInfo.xcprivacy`. Both SDKs are installed and their collection is known, but the manifest lands
  with the native build work, not here (no prebuild in this task).

### What this broke in the legacy `app/`, and how it was repaired

Rebuilding the registry broke `app/`: 30 typecheck errors across `app/src/analytics/**` and
`app/src/onboarding/**`. Two causes. The registry's `FlowScreen` union is the rail the product ships,
while the legacy app renders the retired seven-screen one (`value-prop`, `confession`, `mirror`,
`permissions-primer`, `pick-apps`, `paywall`, `sign-up`), and one union cannot describe both. The
rest were the cut events and the events whose props stopped being empty.

The repair keeps the shipping union untouched. `packages/analytics-events/src/legacy.ts` holds the
retired rail — `LEGACY_FLOW_SCREENS`, `LegacyFlowScreen`, `isLegacyFlowScreen` — plus `LegacyPropsOf`,
which puts the two funnel events back on that rail and leaves every other event's shape alone. So
`app/`'s kit still refuses a cut event, a wrong payload or an excess property; only its screen ids
differ. `app/`'s analytics and onboarding modules import the legacy names; nothing else may.

The cut events were repaired in `app/` itself, not by restoring them. `trackTypeLaw.ts` now asserts
the same laws over events that exist, and moves `milestone_unlocked` and `notification_toggled` from
its legal section to its illegal one, so the compiler proves B16 and B30 actually removed them. The
privacy test that used `earn_claimed` to prove workout metrics are dropped now uses `rule_met`, which
proves more: the four declared properties survive and the signal, source and minutes do not.

`legacy.ts` is deleted with `app/` — the checklist is in `P2-T12-cutover.md`. Root `npm test` is green
in the meantime.

### Handed to P2-T12: the App Privacy manifest

`app-next/release/app-privacy.json` and its `README.md` are P2-T12's files, copied into this branch so
the release guardrail (`guardrails/release/privacy-manifest.test.ts`, still only in `build/P2-T12`)
passes the moment the two lanes meet. `README.md` is byte-identical to T12's; take T12's copy on any
conflict. In `app-privacy.json` this task changed values only, never the shape:

- `analyticsEvents` is now the 28 events `packages/analytics-events` marks `owner: 'client'`, not the
  eight ceremony events. That is the allowlist the adapter enforces, so a lane that adds a call site
  never has to edit the manifest again.
- Two conditional notes are settled as facts. Crash Data stays **not** linked to the user: nothing calls
  `Sentry.setUser`, `sendDefaultPii` is false and `beforeSend` deletes `event.user`. Performance Data
  stays **not** collected: tracing, profiling, app-start, native frames, stalls and replay are all off.
- Precise Location is corrected. T12 read `gym_unlock_tapped` as carrying a distance in metres; it
  carries no location value at all, because its spec declares only `preview` and `safeProperties` drops
  every key a spec does not name.
- Device ID gains the `identified_only` fact, and loses the claim that Sentry records an installation id.
- Product Interaction gains the opt-out and the two-floor privacy policy; Other Data Types points at
  `adapters/analytics/personProperties.ts` instead of the plan.

`docs/release/app-privacy.md` is the derived label and stays T12's to re-derive. Four of its claims are
now stale: the Device ID row's "Sentry installation id on crashes", the Crash Data row's "flip to linked
if P2-T07 adds it", the not-declared table's `gym_unlock_tapped.distance` sentence, and the events
section, which lists `support_request_submitted` and `account_deleted` as client events — the registry
gives both to the server, so the client cannot emit them.
