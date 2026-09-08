# P2-T10 — Real Settings, permissions health, subscription management, account deletion

## Steps

1. Permissions health rows read live statuses from the adapters (P2-T04/T05/T09) on foreground; Fix →
   request when `notDetermined`, `Linking.openSettings()` when denied. Home and the setup ceremonies use
   the same denied recovery instead of attempting a request the OS will not show again.
2. Subscription: plan and renewal from the Adapty profile; Manage subscription →
   `https://apps.apple.com/account/subscriptions`; Restore → adapter.
3. Rate ExcerLock: `expo-store-review` policy ported (thresholds re-based: 5th met day with install age ≥ 3
   days → first 7-day streak → 30-day streak; stop after 3 shows or manual rate); the store URL configured
   (App Store id from `asc` CLI).
4. Share ExcerLock: native share sheet with the App Store URL.
5. Support: real `POST /v1/support` with retry semantics ported from `app/src/support`; send P2-T22's
   `SupportRequest` including the reply address and privacy-floored diagnostics.
6. Account: sign in/out via P2-T01; Delete account → server `DELETE /v1/user` → ordered erasure; local rules
   kept (local-first); new anonymous session.
7. Legal documents: real Terms and Privacy text supplied by Johan (placeholder stays flagged in the content
   file until then; the app must not ship with placeholders — add a release guardrail test that fails if the
   placeholder marker is present in a production build).

## Acceptance

- [ ] Every Settings row does the real thing on the simulator; deletion verified against the dev Supabase
      project and the VPS (row tombstoned, Adapty logout called, PostHog reset).
- [ ] Release guardrail for legal placeholders green only when real text is present.
- [ ] Home, setup ceremonies and Settings open iOS Settings for a denied permission and request only when
      the permission is `notDetermined`.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- Settings is the one screen P2-T22 rebuilt; this task wires its rows. The paywall modal is presented over
  Settings, support and deletion while lapsed (B21).
- Permission fix path: `Linking.openSettings()` when denied (already the fake's behaviour after P2-T22).
- Step 5 sends P2-T22's widened support payload (reply address, privacy-floored diagnostics).
- Step 6 handles deletion of an anonymous session's data.
- "Export my data" (PRD) and the analytics opt-out are pending Johan's answer in `fix-plan.md`; if kept, an
  Account row produces a JSON of rules, rule days, history and earned unlocks and emits
  `data_export_requested` (P2-T02 defines it).

## Build notes (2026-09-07, branch `build/P2-T10`)

Built against the ports and fakes while P2-T01/T02/T06 were in flight; the real composition is one
call site each:

- `src/adapters/api/` — `createApiClient({ baseUrl, getAccessToken })`, `createHttpSupportPort(client)`
  (step 5), `createUserApi(client)` and `withServerDeletion(auth, userApi)` (step 6). The endpoint
  contract is in its README; T02 was asked to accept `{ category: problem|question|idea, message, replyTo,
  diagnostics }` on `POST /v1/support`, and T01 to expose `accessToken()` on the Supabase adapter and keep
  its `deleteAccount()` local-only.
- Step 1: the runtime host already re-reads Screen Time, Motion, Health, Reminders and Camera on
  foreground; Location has no status accessor on `GymPort`, so its row follows the last request result
  until P2-T05 publishes it.
- Step 2: Manage subscription opens `https://apps.apple.com/account/subscriptions`; plan and renewal
  render the entitlement the subscription adapter publishes to the store.
- Steps 3–4: `src/adapters/review/` (policy re-based on met days; App Store id 6787265352 from
  `asc apps list`); Share uses the native share sheet with the product URL.
- Step 7: `content/legal.ts` carries `placeholder: true`; `content/__tests__/legal-release.test.ts` fails
  a production build while it does.
- Open question 3 default taken: Export my data ships as an Account row (`domain/dataExport`); the
  analytics opt-out switch stays with P2-T07.
- Dependencies added to `app-next/package.json` without `npm install` (versions already hoisted in the
  workspace): `expo-store-review`, `expo-file-system`.

## Status against acceptance

- [ ] Every Settings row does the real thing on the simulator; deletion verified against the dev Supabase
      project and the VPS (row tombstoned, Adapty logout called, PostHog reset). *(needs the real
      runtime composition from P2-T01/T02/T06/T12)*
- [x] Release guardrail for legal placeholders green only when real text is present.
- [x] Home, setup ceremonies and Settings open iOS Settings for a denied permission and request only when
      the permission is `notDetermined`.
- [x] Every row is exercised against the ports with fakes: `features/settings/__tests__/wiring.test.tsx`,
      `adapters/api/__tests__/*`, `adapters/review/__tests__/*`.
