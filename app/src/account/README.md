# Account

Account is the app-facing seam for signed-out and signed-in state, sign-in and
sign-up intents, sign-out, and account deletion. Phase 2 uses a persistent
deterministic mock. Phase 5 replaces that adapter with Clerk without changing
callers.

## Interface

Callers import only `index.ts` and obtain the adapter through
`getAccountModule()`. The vendor-free interface exposes:

- a snapshot containing `signedOut` or `signedIn` session state plus the
  current intent and normalized error;
- `signIn()` and `signUp()`, each returning authenticated, cancelled, or failed
  outcomes;
- `signOut()`, which clears the remote-shaped session but never local product
  data;
- `deleteAccount()`, which represents the authenticated server deletion and
  returns deleted or failed;
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
- conditions, earning history, lock choices, and settings remain on the
  device;
- deletion is irreversible.

The user must then choose `Delete account forever` or `Keep my account`.
Failure leaves the session signed in and renders the normalized server error.

The app does not emit `account_deleted`. The Phase-5 adapter calls the protected
`/v1/user` server boundary, and the server owns both authoritative deletion and
the `account_deleted` event. Adding a client capture here would violate the
analytics single-emitter law.

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

## Phase-5 Clerk swap

Phase 5 changes only the constructor in `accessor.ts` to a Clerk-backed
`AccountModule`. That adapter will:

- translate Clerk session/profile state into `AccountSession`;
- normalize sign-in and sign-up success, cancellation, and error outcomes;
- sign out through Clerk while leaving all local earning and locking data
  untouched;
- call the authenticated `/v1/user` server boundary for deletion and clear the
  Clerk session only after authoritative success;
- keep Clerk SDK types and credentials inside the adapter.

No Clerk SDK or auth key is installed by this module. No account caller changes
at the swap.

## Test

From the repository root:

```sh
npm run test:app -- account
```
