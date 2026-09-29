# Auth runtime

This directory owns ExcerLock's client-side Supabase identity boundary. `createAuthServices` returns the real `SupabaseAuthAdapter`, the single serialized `IdentityCoordinator`, the shared `waitForIdentityReady` purchase/restore gate, the global `runIdentityOperation` serializer, and a disposer. It deliberately does not modify `createRuntime` or compose fake analytics/subscription adapters.

## Root wiring

The root composition must provide `clientAuth.supabaseUrl`, `clientAuth.supabaseAnonKey`, `clientApi.apiBaseUrl`, the Google iOS client ID and redirect URI, plus real awaited functions for analytics identify/reset, subscription activate+identify/reset, PostHog distinct-ID lookup, and Adapty `setIntegrationIdentifier`. The factory has no no-op identity-vendor defaults. Root must expose `auth` through `Runtime`, call `auth.boot()` at startup, retain the returned services for app lifetime, and call `dispose()` on teardown.

Every purchase, restore and paywall load must await the exact `waitForIdentityReady` function returned by this factory. A canonical UID alone is insufficient: the gate resolves only after authenticated `PUT /v1/user`, PostHog identify, Adapty activate/identify, and `posthog_distinct_user_id` attachment finish in order.

The coordinator runs that spine once per identity and stops silently at the first failed step. Waiting is therefore also the retry: each `waitForIdentityReady` call registers its waiter first, then retries a failed anonymous boot (`retryBoot`) or re-runs a stuck spine (`coordinator.retry()`, joining a run already in flight and trying once more if that run fails). Without it, one failed `PUT /v1/user` at launch left the identity unready for the whole session, and every paywall load, purchase and restore failed until the app was killed (App Review 2.1(b), Build 12, Sep 28 2026). The identity lab scenarios in `dev-harness` reproduce both failures on the simulator. T05 must use the returned global serializer for identity-sensitive vendor transitions; the raw identify/reset callbacks supplied to this factory must not acquire that serializer again.

`SignInScreen` accepts an injected `signInRequired` boolean or function (sync or async, default false) for optional sign-in surfaces. Setup and cold-launch access instead require a fresh provider or email-code authentication regardless of the PostHog flag. `launchSignInGate` is non-persisted and approves only the current canonical UID and generation after that explicit action; neither restored secure storage nor the persisted Session can grant main-app access. A returning user's provider/OTP authentication must match the UID already on this device; a mismatch restores the previous secure session and leaves the app locked. The welcome footer still uses `useSignInRequiredSource()` for its optional sign-in sheet.

## Security and lifecycle

Supabase access, refresh, and provider tokens live only in `SecureSupabaseStorage`. The Zustand/AsyncStorage `Session` remains non-secret. SecureStore values are chunked and corruption rejects visibly so a damaged permanent session cannot silently become a new anonymous identity.

Boot hydrates secure storage first and starts at most one anonymous request. Its five-second UI fallback is provisional; the original request continues and reconciles with generation guards. Auth SDK callbacks are deferred outside the SDK lock. Sign-out, recovery, tombstone handling, and deletion increment generations where identity ownership changes so late results cannot restore an erased or previous UID.

New Apple/Google identities call auth-js 2.116.0's native-token `linkIdentity` overload. Apple sends the SHA-256 nonce to Apple and the raw nonce to Supabase. Existing-account recovery is explicit and uses `signInWithIdToken`; it never accepts a caller-provided source UID, aliases PostHog people, or transfers subscriptions client-side. Email conversion uses `updateUser({ email })` then `verifyOtp(... type: 'email_change')`; recovery uses the regular email OTP flow.

Deletion keeps the secure session until authenticated server acceptance. Network loss and 5xx responses remain visibly retryable. After 204/410, local SDK identity is reset and a fresh anonymous session is created. Provisional-only deletion is local and sends no nonexistent server UID. The server's durable worker owns remote erasure and lost-response completion.

## Verification limits

Unit tests prove request shapes, ordering, generation guards, storage behavior, and visible failure semantics. Native Apple audience/provider activation, Google redirect/provider configuration, email templates, and real device credentials still require preview-build and physical-device verification after root/native integration.

