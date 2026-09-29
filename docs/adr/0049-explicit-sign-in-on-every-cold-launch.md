---
status: accepted
date: 2026-09-29
---

# 0049: Explicit sign-in before the main app on every cold launch

## Decision

A saved Supabase session, a persisted signed-in label, completed Setup and an active Entitlement are not evidence of a sign-in performed in the current app process. Every cold launch starts with a non-persisted, denied main-app gate. Only a successful, user-initiated Apple, Google or email-code authentication for the current canonical identity approves it. Main routes and deep links remain protected until then. Setup after the Paywall requires sign-in, never Skip or a saved-session Continue. On a returning account, authenticating must keep the same user ID or fail closed without switching account data. A foreground return to the same still-running process does not reset this gate.

## Context

Build 13 opened directly to Home when persisted `onboarding.complete` and `setupComplete` were true. `bootDestination` ignored sign-in entirely; the route guard checked only `setupComplete`. The sign-in screen offered a Continue button for a restored `signedIn` label, and ADR 0043 left Setup sign-in skippable via a remotely configurable flag. This was not a secure sign-in requirement. The owner requires explicit authentication even on devices whose users signed in previously. The existing anonymous identity and Paywall-before-Setup order remain; no purchase is silently attributed to a different user.

## Consequences

Returning users must authenticate again after a process restart. A lost network, canceled provider prompt or mismatched account cannot open the main app; secure sessions are retained for retry instead of destructively signing out at boot. Direct routes are protected as well as the root redirect. A demo scenario can explicitly approve its fake identity so unrelated simulator proofs still run, while a returning-session scenario proves the denied path. This gate is local app access, not server authorization; server and vendor APIs still verify their own credentials. Real Apple/Google/email reauthentication and TestFlight StoreKit purchases remain device verification gates, not established by scripted simulator proofs.

## References

- [ADR 0043](0043-sign-in-and-permissions-after-the-paywall.md): accepted, optional sign-in portion superseded here.
- [ADR 0011](0011-canonical-identity-and-durable-erasure.md): accepted, retained canonical identity and account-switch boundaries.
- `app-next/src/packages/identity/launchSignInGate.ts`, `app-next/src/packages/launch/BootGate.tsx`, `app-next/src/packages/launch/RootNavigator.tsx`, `app-next/src/packages/setup/SetupFlow.tsx`.
- `.agents/skills/verify-excerlock/references/features/setup.md`: returning-session focused proofs.
