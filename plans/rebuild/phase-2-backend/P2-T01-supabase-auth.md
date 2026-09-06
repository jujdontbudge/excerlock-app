# P2-T01 — Supabase auth in the app (`AuthPort` real adapter)

## Facts

- Supabase is auth only (D1). No Supabase database tables, no RLS, no Edge Functions are used by the app.
- Sign-in methods: Apple, Google, email OTP (B18). Anonymous session from first launch so the identity spine
  exists before sign-in; linking a provider keeps the same user id.
- The old `AccountModule` shape (`snapshot`, `signIn`, `signUp`, `signOut`, `deleteAccount`, `subscribe`) is
  vendor-free and maps onto `AuthPort`; keep the deletion ordering law (Adapty → PostHog → auth provider last).

## Steps

1. Verify current SDK shapes in the official docs (Supabase MCP `search_docs` or `supabase.com/docs`) before
   coding: `@supabase/supabase-js` in Expo with a secure-store session adapter (`expo-secure-store` for the
   refresh token; AsyncStorage is not acceptable for tokens), `signInAnonymously`, `signInWithIdToken` for
   Apple (via `expo-apple-authentication`) and Google (via `@react-native-google-signin/google-signin` or
   `expo-auth-session`; pick per Expo MCP guidance), `signInWithOtp` + `verifyOtp` for email, `linkIdentity`
   for anonymous → provider upgrade, `signOut`, and admin deletion (server-side, P2-T02).
2. `src/auth/SupabaseAuthAdapter.ts` implementing `AuthPort`; `src/auth/supabaseClient.ts` (URL + anon key
   from `app.config.ts` `extra`, following the old pattern of `~/.excerlock/env` fallback); session
   persistence; auto-refresh; app-state foreground refresh.
3. Provisioning: on any session (anonymous included), call the server's idempotent `PUT /v1/user` with the
   Supabase access token before reporting `signedIn` (as the old bridge did); handle `410 ACCOUNT_DELETED`
   by signing out locally and starting a fresh anonymous session.
4. Tests: port-level contract tests (same suite the fake passed), adapter tests with a mocked supabase-js
   client for every method and error class (network, invalid code, cancelled Apple sheet, identity already
   linked), deletion ordering test.
5. Screens: X4 and Settings › Account now call the real port; the email code screen uses real OTP; Apple
   button uses the native `AppleAuthentication.AppleAuthenticationButton` where required by Apple's guidelines.
6. Config: `app.json` adds `expo-apple-authentication` plugin (entitlement `com.apple.developer.applesignin`)
   and the Google URL scheme; verify via Expo MCP.

## Acceptance

- [ ] Fresh install → anonymous session → `PUT /v1/user` provisions a row keyed by the anonymous uid.
- [ ] Sign in with Apple, Google, and email OTP each link to the same uid (dashboard shows one user, three
      identities) on the dev Supabase project.
- [ ] Sign out → new anonymous session; rules untouched (local-first test).
- [ ] No token ever touches AsyncStorage or logs (grep test).
