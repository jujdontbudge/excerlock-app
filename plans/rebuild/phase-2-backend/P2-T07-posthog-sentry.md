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
- The O06/O07 person-property line depends on Johan's answer on the option lists (P2-T23).
