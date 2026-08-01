# Account

Account is the app-facing seam for signed-out and signed-in state, sign-in and
sign-up intents, sign-out, and account deletion. Keyless builds select a
signed-out no-op adapter so missing configuration cannot crash or create a
fictional session. Configured builds replace the Phase-2 mock with Clerk
without changing callers.

## Interface

Callers import only `index.ts` and obtain the adapter through
`getAccountModule()`. The vendor-free interface exposes:

- a snapshot containing `signedOut` or `signedIn` session state plus the
  current intent and normalized error;
- `signIn()` and `signUp()`, each returning authenticated, cancelled, or failed
  outcomes;
- `signOut()`, which clears the remote-shaped session but never local product
  data;
- `deleteAccount()`, which invokes authenticated authoritative server deletion
  and returns deleted or failed;
- snapshot change subscription for renderers.

`AccountSettingsCard` owns Settings account rendering, session actions, errors,
and the inline deletion confirmation. `AccountOnboarding` owns the required
post-purchase account step. Those renderers receive only this interface and may
inject an adapter in tests.

## Local-first law

An account never gates earning or locking. Conditions, the earn journal, ledger
decisions, lock configuration, and Screen Time reconciliation remain
on-device and operate while the account snapshot is `signedOut`.

Signing out and account deletion clear only the account session. They do not
clear Home, Lock, Settings, onboarding, or Screen Time storage. The signed-out
integration test records a real Home event payout and verifies that the ledger
still lifts shields. No current Home/Lock/ScreenTime/ledger caller reads this
boundary.

Account-backed services may require a session in Phase 5, but that requirement
must stay at those service boundaries. It must never move into core
earn-or-lock decisions.

## Deletion contract and analytics ownership

Deletion has no silent path. Settings first explains that:

- the Clerk account and ExcerLock server record are permanently destroyed;
- Adapty and PostHog erasure is scheduled;
- all on-device data, including conditions, earning history, lock choices, and
  settings, remains on the device;
- deleting the account does not cancel an App Store subscription;
- deletion is irreversible.

The user must then choose `Delete account forever` or `Keep my account`.
Failure leaves the session signed in and renders the normalized server error.

The app does not emit `account_deleted`; adding a client capture here would
violate the analytics single-emitter law. The adapter calls authenticated
`DELETE /v1/user`, and clears its local Clerk session only after that
authoritative endpoint succeeds. Before the request it flushes pending PostHog
events so they arrive before erasure. After success it discards anything queued
during the request before resetting the PostHog identity, logs out the Adapty
customer, and signs out of Clerk. These vendor resets do not cancel the Apple
subscription.

## Mock, persistence, and clock

`MockAccountModule` implements the production interface and adds deterministic
outcome drivers only for its own tests. Signed-in session metadata persists
under `excerlock.account.mock.v1`; transient loading, intent, and error state
starts clean on launch. Persisted data is validated before it crosses the
interface.

Authentication timestamps come exclusively from the injected account clock.
The mock stores no token or vendor object. Its session metadata is a Phase-2
fixture, not a model for production credential storage.

The mock class, persistence, and clock are deliberately not exported from
`index.ts`. App modules depend on `AccountModule` or use
`getAccountModule()`.

## Clerk runtime

Configured builds select `ClerkAccountModule` in `accessor.ts`.
`AccountRuntimeRoot` mounts `ClerkProvider` once at the Expo root and passes
Clerk's `tokenCache`, which persists credentials through `expo-secure-store`
(iOS Keychain / Android Keystore-backed storage). `ClerkAccountBridge` keeps SDK
hooks and types inside the module and attaches their actions to the class
adapter.

The adapter:

- translate Clerk session/profile state into `AccountSession`;
- normalize sign-in and sign-up success, cancellation, and error outcomes;
- calls authenticated, idempotent `PUT /v1/user` after Clerk activates a
  session, attaching the Clerk subject to Postgres before authentication
  reports success;
- keeps restored Clerk sessions signed out at the app account boundary while
  that same provisioning call retries, preventing a partial identity spine;
- treats `410 ACCOUNT_DELETED` as terminal recovery: durably discard PostHog's
  queued identified events before reset, log the Adapty customer out, and clear
  the stale Clerk session without retrying or emitting a post-deletion event;
- sign out through Clerk while leaving all local earning and locking data
  untouched;
- starts Google OAuth through Clerk SSO at the allowlisted
  `excerlock://sso-callback` redirect;
- calls authenticated `DELETE /v1/user` and clears its local Clerk session only
  after authoritative success, with PostHog/Adapty identity cleanup around the
  request so erased profiles cannot be recreated by queued client work;
- keep Clerk SDK types and credentials inside the adapter.

The only app credential is `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; the Clerk secret
key is server-only. Empty or whitespace keys bypass `ClerkProvider` entirely and
select `NoopAccountModule`, so keyless builds stay signed out without crashing.

## Test

From the repository root:

```sh
npm run test:app -- account
```
