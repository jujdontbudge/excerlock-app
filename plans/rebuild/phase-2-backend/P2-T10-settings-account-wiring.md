# P2-T10 — Real Settings, permissions health, subscription management, account deletion

## Steps

1. Permissions health rows read live statuses from the adapters (P2-T04/T05/T09) on foreground; Fix →
   request when `notDetermined`, `Linking.openSettings()` when denied.
2. Subscription: plan and renewal from the Adapty profile; Manage subscription →
   `https://apps.apple.com/account/subscriptions`; Restore → adapter.
3. Rate ExcerLock: `expo-store-review` policy ported (thresholds re-based: 5th met day with install age ≥ 3
   days → first 7-day streak → 30-day streak; stop after 3 shows or manual rate); the store URL configured
   (App Store id from `asc` CLI).
4. Share ExcerLock: native share sheet with the App Store URL.
5. Support: real `POST /v1/support` with retry semantics ported from `app/src/support`.
6. Account: sign in/out via P2-T01; Delete account → server `DELETE /v1/user` → ordered erasure; local rules
   kept (local-first); new anonymous session.
7. Legal documents: real Terms and Privacy text supplied by Johan (placeholder stays flagged in the content
   file until then; the app must not ship with placeholders — add a release guardrail test that fails if the
   placeholder marker is present in a production build).

## Acceptance

- [ ] Every Settings row does the real thing on the simulator; deletion verified against the dev Supabase
      project and the VPS (row tombstoned, Adapty logout called, PostHog reset).
- [ ] Release guardrail for legal placeholders green only when real text is present.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- Settings is the one screen P2-T22 rebuilt; this task wires its rows. The paywall modal is presented over
  Settings, support and deletion while lapsed (B21).
- Permission fix path: `Linking.openSettings()` when denied (already the fake's behaviour after P2-T22).
- Step 5 sends P2-T22's widened support payload (reply address, privacy-floored diagnostics).
- Step 6 handles deletion of an anonymous session's data.
- "Export my data" (PRD) and the analytics opt-out are pending Johan's answer in `fix-plan.md`; if kept, an
  Account row produces a JSON of rules, rule days, history and earned unlocks and emits
  `data_export_requested` (P2-T02 defines it).
