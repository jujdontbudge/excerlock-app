# Auth runtime

This directory owns ExcerLock's client-side Supabase identity boundary. `createAuthServices` returns the real `SupabaseAuthAdapter`, the single serialized `IdentityCoordinator`, the shared `waitForIdentityReady` purchase/restore gate, the global `runIdentityOperation` serializer, and a disposer. It deliberately does not modify `createRuntime` or compose fake analytics/subscription adapters.

## Root wiring

The root composition must provide `clientAuth.supabaseUrl`, `clientAuth.supabaseAnonKey`, `clientApi.apiBaseUrl`, the Google iOS client ID and redirect URI, plus real awaited functions for analytics identify/reset, subscription activate+identify/reset, PostHog distinct-ID lookup, and Adapty `setIntegrationIdentifier`. The factory has no no-op identity-vendor defaults. Root must expose `auth` through `Runtime`, call `auth.boot()` at startup, retain the returned services for app lifetime, and call `dispose()` on teardown.

Every purchase, restore and paywall load must await the exact `waitForIdentityReady` function returned by this factory. A canonical UID alone is insufficient: the gate resolves only after authenticated `PUT /v1/user`, PostHog identify, Adapty activate/identify, and `posthog_distinct_user_id` attachment finish in order.

The coordinator runs that spine once per identity and stops silently at the first failed step. Waiting is therefore also the retry: each `waitForIdentityReady` call registers its waiter first, then retries a failed anonymous boot (`retryBoot`) or re-runs a stuck spine (`coordinator.retry()`, joining a run already in flight and trying once more if that run fails). Without it, one failed `PUT /v1/user` at launch left the identity unready for the whole session, and every paywall load, purchase and restore failed until the app was killed (App Review 2.1(b), Build 12, Sep 28 2026). The identity lab scenarios in `dev-harness` reproduce both failures on the simulator. T05 must use the returned global serializer for identity-sensitive vendor transitions; the raw identify/reset callbacks supplied to this factory must not acquire that serializer again.

`SignInScreen` accepts an optional sign-in flag for optional surfaces. Paid routes require a remembered signed-in account and account-bound server admission regardless of that flag (ADR 0061). Restored Supabase sessions retain their UID until explicit sign-out, deletion or successful account recovery.

## Security and lifecycle

Supabase access, refresh, and provider tokens live only in `SecureSupabaseStorage`. The Zustand/AsyncStorage `Session` remains non-secret. SecureStore values are chunked and corruption rejects visibly so a damaged permanent session cannot silently become a new anonymous identity.

Boot hydrates secure storage first and starts at most one anonymous request. Its five-second UI fallback is provisional; the original request continues and reconciles with generation guards. Auth SDK callbacks are deferred outside the SDK lock. Sign-out, recovery, tombstone handling, and deletion increment generations where identity ownership changes so late results cannot restore an erased or previous UID.

New Apple/Google identities use native-token `linkIdentity`. A provider conflict or ordinary returning sign-in authenticates the selected account once and adopts its verified UID. Credentials must succeed before previous account data or SDK identities are reset; failure preserves the previous session and local data. Same-UID restrictions apply to explicit linking, not account recovery (ADR 0086). Apple requests email scope and uses a cryptographic nonce; unknown native failures offer retry or email and canceled sheets stay silent.

All email surfaces request a normal OTP with `shouldCreateUser: true`, then verify `type: email`. This works for existing accounts and new complimentary recipients even when Supabase auto-confirms account creation. The one-hour local challenge contains only email, checkout UID and resend/expiry times; it survives process death and never contains an OTP. Resend cooldown and a synchronous screen guard prevent duplicate sends. Adapter single-flight verification joins concurrent calls; successful credentials are not consumed again. Incorrect codes preserve account data and the current challenge. See `emailChallenge.ts` and ADR 0086.

An established account adds another verified Apple or Google login only through `linkWithApple` or `linkWithGoogle`. Those operations require a non-anonymous canonical session, preserve its UID and generation, and treat an already-owned provider as account recovery instead of selecting or merging the other account. Ordinary returning sign-in continues to reauthenticate or recover; it does not silently link credentials.

Deletion keeps the secure session until authenticated server acceptance. Network loss and 5xx responses remain visibly retryable. After 204/410, local SDK identity is reset and a fresh anonymous session is created. Provisional-only deletion is local and sends no nonexistent server UID. The server's durable worker owns remote erasure and lost-response completion.

## Verification limits

Focused simulator proofs and local API/database exercises establish request shapes, ordering, generation guards, persistence and visible recovery. Native Apple audience/provider activation, Google redirect/provider configuration, email templates, and real device credentials still require preview-build and physical-device verification after root/native integration.

The pinned `expo-apple-authentication@57.0.2` predates the scene-aware presentation-window fix in Expo [#46955](https://github.com/expo/expo/pull/46955). `app-next/patches/expo-apple-authentication+57.0.2.patch` backports its retained presentation anchor and recoverable missing-window error, using the SDK 57 `SceneGeometry.keyWindow()` helper directly. This matches the foreground-scene lookup selected by Expo [#48319](https://github.com/expo/expo/pull/48319), without upgrading Expo. It requires a new binary; an OTA cannot change this Swift code. The patch addresses a documented iOS 27 presentation failure, but `ERR_REQUEST_UNKNOWN` also covers unrelated native failures and does not prove that this caused an individual incident.
