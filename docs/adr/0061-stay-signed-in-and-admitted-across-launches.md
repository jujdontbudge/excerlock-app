---
status: superseded
date: 2026-10-03
---

# 0061: Stay signed in and admitted across launches

## Decision

A sign-in lasts until the person signs out or deletes their account. Closing the app, force quitting, an OTA reload, a phone restart and iOS ending the app in the background never ask for sign-in again and never send a returning subscriber back to Welcome.

- **Remembered sign-in.** A successful Apple, Google or email-code sign-in stores the account's user ID in the persisted `excerlock-next.remembered-sign-in.v1` store (identity package). A restored Supabase session counts as signed in only when it belongs to that user ID. AsyncStorage does not survive a reinstall while the Keychain session does, so a reinstall still asks for sign-in ("Welcome back"). Installs from before this record (completed Setup, signed-in session, no remembered ID) are remembered on their first launch.
- **Remembered admission.** Each eligible server check stores `{userId, environment, expiresAt, observedAt, verifiedAt}` in the persisted `excerlock-next.remembered-admission.v1` store (subscription package). It admits the same account in the same store environment until three days after `expiresAt`. A server answer of ineligible clears it at once. A failed or unreachable check keeps it.
- **Launch resume.** The Journey starts in a `launch` phase. Once per cold launch, after stores hydrate and identity boots, `BootGate` resumes a remembered account: Home when Setup is complete, Setup otherwise. With a remembered admission this needs no network, and the server check runs in the background as soon as the identity spine is ready. With no remembered admission, the launch cover stays up for one server check. Leaving through the Paywall's Close or Back to start goes to Welcome and is not undone by the resume.
- **Offline boot.** When Supabase cannot refresh an expired access token because the network is down, the adapter applies the session saved in the Keychain instead of failing startup. Foregrounding the app retries an identity spine that could not finish.
- **Sign out and Delete account** clear both remembered stores and the live lease, then open Welcome.

This supersedes ADR 0049 in full. It supersedes the parts of ADR 0050 that start every cold launch at Welcome and hold admission only in process memory, and the part of ADR 0059 that covers the screen after a long background when a remembered admission is valid. Account-bound server verification (ADR 0050) and in-place renewal (ADR 0059) stay.

## Context

On 2026-10-03 the owner signed in, killed the app and landed on the first Onboarding page, where he had to sign in again. That was ADR 0049 and ADR 0050 working as written: a non-persisted launch gate, and a Journey that restarted at Welcome on every cold launch. A five-minute, process-local, fail-closed lease (ADR 0050, ADR 0059) also meant a subscriber with no signal could not reach Home, and an outage of our API or Adapty locked every subscriber out at launch. An offline launch more than an hour after last use failed to start at all, because the Supabase token refresh error was treated as an unreadable saved sign-in.

No top consumer app works this way. Opal, Duolingo, Strava, Calm and Headspace keep you signed in until you sign out, and the subscription SDKs they use (RevenueCat, Adapty) show premium from a cached entitlement while refreshing in the background. A network error never signs anyone out. RevenueCat's offline entitlements use the same three-day cap. Research and the full lifecycle audit: issue #162 and `docs/plans/lifecycle/`.

Alternatives considered: keeping the gate but persisting it per process (same result as this, with more moving parts), and treating any non-anonymous Keychain session as signed in (re-admits a reinstall on a shared or resold phone without a fresh sign-in).

## Consequences

A returning subscriber opens to Home in one frame on a warm device, online or offline. A refund or lapse is still caught at the first server check after launch or foreground, and in-place renewal still runs every four minutes while the app is open. An unreachable server costs nothing for up to three days past the paid-through date. Renewal retries back off from 15 seconds to five minutes while the server is unreachable, instead of retrying every 15 seconds indefinitely.

Accepted trade-offs: someone who keeps the phone offline can keep access for up to three days after a cancellation, and a tampered device can edit AsyncStorage. Neither changes what the server or the Screen Time extensions trust.

Follow-up, tracked in issue #162: Keychain accessibility for background wakes while the phone is locked, connectivity-triggered rechecks while the app stays open, Onboarding resuming at the saved page, and a signed-out paid user returning mid-Setup.

## References

- [ADR 0049](0049-explicit-sign-in-on-every-cold-launch.md): superseded here.
- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md): accepted; cold-launch Welcome-first and process-local-only admission superseded here.
- [ADR 0059](0059-admission-renews-in-place.md): accepted; long-background launch cover superseded here when a remembered admission is valid.
- [ADR 0011](0011-canonical-identity-and-durable-erasure.md): accepted; account-switch boundaries unchanged.
- `app-next/src/packages/identity/rememberedSignIn.ts`, `app-next/src/packages/subscription/rememberedAdmission.ts`, `app-next/src/packages/journey/index.ts` (`resumeReturningAccount`, `forgetAccount`, `renewAdmission`), `app-next/src/packages/launch/BootGate.tsx`, `app-next/src/packages/identity/lib/SupabaseAuthAdapter.ts` (`runBoot`).
- Proofs: `launch/subscriber-opens-home`, `launch/sign-in-survives-relaunch`, `launch/offline-relaunch-keeps-home`, `launch/lapsed-while-away-opens-paywall`, `setup/sign-out-relaunch-stays-welcome`.

Superseded by [ADR 0091](0091-guest-first-accounts-and-adapty-access.md).
