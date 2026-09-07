# P2-T09 — The two local notifications

Decision B14: only the trial-ending reminder and the walk-lease warning. No push. `withNoPush` stays first in
the plugin list and the guardrail keeps `aps-environment` out.

## Steps

1. `NotificationsAdapter implements NotificationsPort` over `expo-notifications` local scheduling (port the
   reduced parts of `app/src/notifications/`: permission boundary, deterministic ids, delivery evidence store).
2. Trial reminder: scheduled when the entitlement becomes `trial` with a known `renewsAt`, at
   `renewsAt − 2 days` at 18:00 local (or `renewsAt − 24 h` if the trial is shorter than 3 days); cancelled on
   conversion/cancel; tapping opens Settings › Subscription. Copy ≤ 35/90 chars, payoff-first, no guilt.
3. Walk-lease warning: 30 s before lease expiry during a walking session (state rule), as today; no toggle.
4. Permission: requested only from T3 ("Enable reminders") and Settings › Permissions; never elsewhere.
5. Tests: scheduling math, cancellation, permission gating, the "no other notification type exists" test
   (catalog has exactly two ids).

## Acceptance

- [ ] Simulator: trial → reminder scheduled (inspect pending notifications via the dev menu); lease warning
      fires during a simulated session.
- [ ] Clean prebuild has no `aps-environment` (guardrail).

## Audit amendments (2026-09-07; see `fix-plan.md`)

- **Three ids** (B30 amends B14): trial reminder, walk-lease warning, and `excerlock.shield.open`, the last
  emittable only by the ShieldAction extension (grep test). The catalog test asserts exactly three.
- **Lease warning** is scheduled at `leaseUntil − 30 s` and rescheduled on every renewal (cancel + schedule,
  skipped when the fire time moves under 5 s), cancelled on any end reason; propped sessions get it too (it is
  their only warning) with the duration-rule variant "Scan again to keep counting".
- **Handler policy**: `setNotificationHandler` presents the lease warning as a banner even in the foreground;
  the trial reminder is suppressed while the paywall is open.
- **Landing table**: each id lands on exactly one route and none inside a guarded stack (trial → Settings ›
  Subscription; lease → Home with the walking sheet; shield → `app/locked-apps.tsx`). Test it.
- No per-notification toggles (B37); the permission is asked from T3 and Settings › Permissions only.
