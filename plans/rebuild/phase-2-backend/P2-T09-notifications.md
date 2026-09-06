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
