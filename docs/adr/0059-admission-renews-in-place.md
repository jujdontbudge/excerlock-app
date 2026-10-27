---
status: superseded
date: 2026-10-01
---

# 0059: Paid admission renews in place before its five-minute lease ends

Partly superseded by [ADR 0061](0061-stay-signed-in-and-admitted-across-launches.md): cold launches resume a remembered account, and the last server-verified admission is remembered on the device.

## Decision

While the app is active in Setup or the main app, the Journey renews the subscription admission lease once less than a minute remains, retrying a failed attempt every 15 seconds. Every renewal and foreground refresh shares one in-flight server check. If the lease has already ended, for example after more than five minutes in the background, the current screen stays mounted under a full-window launch cover until the check settles: eligible continues where the person was, ineligible opens the Paywall, and unavailable without a live lease opens verification. A failed check still never creates or extends a lease.

## Context

ADR 0050 caps admission at five minutes from server verification, but only a foreground return refreshed it, and only in the main app. Setup never refreshed. A paying person who spent more than five minutes in Setup reached the Paywall when Setup finished. The simulator reproduced this with the scenario clock advanced six minutes.

Main-app screens did not bounce during continuous use, but only by accident. The React Compiler memoizes `useJourney`, so the one-second clock tick never re-evaluated the lease. Long-lived hook instances kept a stale `paid`, while freshly mounted ones such as the dev menu reported the truth. Unmounting the main app on every lapse was the alternative. It would lose in-progress screens and flash sign-in on every long background return, contradicting ADR 0050's foreground continuity.

## Consequences

Paid admission stays honest at the five-minute cap without sending paying people to the Paywall or to Home. An active session costs about one subscription check every four minutes. Returning after a long background shows the launch cover for one server round trip, at most the 15-second request timeout. The fake admission now mirrors the five-minute cap, and `excerlock://dev?advance=<ms>` advances the scenario clock in 30-second steps so proofs can cover elapsed time.

## References

- [0050: Hard paywall Journey and account-bound admission](0050-hard-paywall-journey-and-account-bound-admission.md) — accepted; this record implements its lease cap and foreground continuity.
- `app-next/src/packages/journey/index.ts` (`refreshAdmission`, `renewAdmission`, `useJourney`), `app-next/src/packages/launch/RootNavigator.tsx`.
- Proofs: `launch/admission-renews-while-open`, `launch/long-setup-keeps-admission`.

Superseded by [ADR 0091](0091-guest-first-accounts-and-adapty-access.md).
