# Auth runtime

This directory owns ExcerLock's client-side Supabase identity boundary. `createAuthServices` returns the real `SupabaseAuthAdapter`, the `waitForIdentityReady` purchase/restore gate, the global `runIdentityOperation` serializer, and a disposer. Accounts are guest first (ADR 0091).

## Root wiring

The root composition must provide `clientAuth.supabaseUrl`, `clientAuth.supabaseAnonKey`, `clientApi.apiBaseUrl`, the Google iOS client ID and redirect URI, plus real awaited functions for analytics identify/reset, subscription identify/reset, PostHog distinct-ID lookup, and Adapty `setIntegrationIdentifier`. Root must expose `auth` through `Runtime`, call `auth.boot()` at startup, retain the returned services for app lifetime, and call `dispose()` on teardown.

`identitySync` runs once per canonical identity: prepare the account's local data, then Adapty identify, then mark ready. Analytics identify, the Adapty integration identifier and `PUT /v1/user` run after ready and never block a purchase; their failures are reported, a 410 erases the account locally. `waitForIdentityReady` retries a failed anonymous boot and a failed sync until its timeout, so one failed request at launch never leaves the session unready.

## Accounts

Every install boots a Supabase anonymous user. Purchases and Conditions belong to that id from the first launch.

- `saveWithApple` / `saveWithGoogle` link the native ID token to the current id (`linkIdentity`). `sendEmailCode` on a guest calls `updateUser({ email })`; `confirmEmailCode` verifies `type: email_change`, refreshes and checks the id did not change.
- `identity_already_exists` / `email_exists` return `existing-account` and keep the credential in memory. Nothing switches until `useExistingAccount`, which signs in with that credential (or sends an email code with `shouldCreateUser: false`). The switch calls `beforeAccountSwitch({ carryGuestData })`: a guest's Conditions and onboarding progress carry to the account when it has no data on this device.
- Sign out and delete call `beforeAccountSwitch({ signedOut: true })`, which resets onboarding, then start a fresh guest.
- The one-hour local email challenge keeps the email, the id and whether it saves or signs in. It survives process death and never contains a code.

## Security and lifecycle

Supabase access, refresh, and provider tokens live only in `SecureSupabaseStorage`. The Zustand/AsyncStorage `Session` remains non-secret. SecureStore values are chunked and corruption rejects visibly so a damaged permanent session cannot silently become a new anonymous identity.

Boot hydrates secure storage first and starts at most one anonymous request. Its five-second UI fallback is provisional; the original request continues and reconciles with generation guards. Auth SDK callbacks are deferred outside the SDK lock. Sign-out, recovery, tombstone handling, and deletion increment generations where identity ownership changes so late results cannot restore an erased or previous UID.

Deletion keeps the secure session until authenticated server acceptance. Network loss and 5xx responses remain visibly retryable. After 204/410, local SDK identity is reset and a fresh anonymous session is created. Provisional-only deletion is local and sends no nonexistent server UID. The server's durable worker owns remote erasure and lost-response completion.

## Verification limits

Focused simulator proofs and local API/database exercises establish request shapes, ordering, generation guards, persistence and visible recovery. Native Apple audience/provider activation, Google redirect/provider configuration, email templates, and real device credentials still require preview-build and physical-device verification after root/native integration.

The pinned `expo-apple-authentication@57.0.2` predates the scene-aware presentation-window fix in Expo [#46955](https://github.com/expo/expo/pull/46955). `app-next/patches/expo-apple-authentication+57.0.2.patch` backports its retained presentation anchor and recoverable missing-window error, using the SDK 57 `SceneGeometry.keyWindow()` helper directly. This matches the foreground-scene lookup selected by Expo [#48319](https://github.com/expo/expo/pull/48319), without upgrading Expo. It requires a new binary; an OTA cannot change this Swift code. The patch addresses a documented iOS 27 presentation failure, but `ERR_REQUEST_UNKNOWN` also covers unrelated native failures and does not prove that this caused an individual incident.
