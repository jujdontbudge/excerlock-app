# T04 — Supabase auth (`AuthPort` real adapter)

Spec: `04-identity-and-money.md` §1 steps 1, 5 and §2. Facts: `research/infra-audit.md` §1 (port, fake,
`SignInScreen.tsx`, `AccountScreen.tsx`, zero `identify` call sites).

## Steps

1. `SupabaseAuthAdapter implements AuthPort` over `@supabase/supabase-js` with `expo-secure-store` storage:
   anonymous session at boot (5 s bound → provisional id → reconcile), `signInWithApple` (native
   `expo-apple-authentication` → `signInWithIdToken` with nonce), `signInWithGoogle` (`expo-auth-session` id
   token), `sendEmailCode`/`verifyEmailCode` (OTP), `signOut` (keeps anonymous uid), `deleteAccount`
   (teardown order §1.5), `subscribe`.
2. **Never silent**: map `ERR_REQUEST_CANCELED` → `cancelled`; every other failure → `AuthError` surfaced on
   `SignInScreen` with a retry. Test asserts a provider rejection is not swallowed.
3. `signInRequired` flag (PostHog, default `false`): hides X4 "Skip for now" and the Settings nag when true.
4. Wire `runtime.subscription.identify(uid)` and `runtime.analytics.identify(uid)` from the auth adapter's
   session stream — the first and only call sites (ordering §1 steps 2–3).
5. Account deletion works for anonymous users (deletes local data + VPS row + Adapty logout + PostHog reset).
6. `README` for `src/runtime/auth/` per repo convention.

## Tests first

- Adapter contract suite (same as `AuthFake`) + `auth-order.test.ts` (Supabase → PostHog identify → Adapty
  identify; sign-in keeps uid; delete order) + `auth-never-silent.test.ts`.

## Acceptance

- [ ] Simulator: Apple, Google, email sign-in each produce a Supabase session and the same uid before/after
      linking; sign-out then sign-in returns the same uid.
- [ ] Physical device, `preview` build: one real native Apple sign-in succeeds (provider registration proven).
- [ ] Flip `signInRequired` in PostHog → X4 loses "Skip" without a rebuild.
