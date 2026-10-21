---
status: proposed
date: 2026-10-21
---

# 0088: Resume Onboarding and return to the Paywall without replay

## Decision

Owner approval is required before shipping these navigation changes or the View plans row.

An unfinished Onboarding resumes its saved page after process death, including a cold start that applies an OTA. Reaching the Paywall completes Onboarding, independently of paid admission and Setup. The existing persisted `complete` field records that milestone, and `step: P` remains its checkpoint. Welcome, sign-in, recovery and earlier Onboarding pages do not erase the milestone or answers. Get started, sign-in Back and Create account continue the saved Journey; once the Paywall has been reached, continuation returns there directly. Earlier pages may still be visited or edited deliberately.

Remembered sign-in, account-bound admission, unfinished purchase recovery and an email challenge retain priority at launch. A completed Setup with an explicitly signed-out account still opens Welcome. Explicit account exits in Settings and recovery dismiss the previous flow and replace it with the public launch route, so removing protected screens cannot expose a retained checkout. Continuing from Welcome returns to the Paywall without repeating Onboarding. A checkpoint is navigation only and never admits an account.

For older stores whose milestone was already overwritten, an uncommitted staged plan and a checkpoint back among the questions are treated as replay. The user may return to checkout directly; an explicit plan edit with `returnTo: S3` retains its edit path. This is an inferred navigation repair, not evidence that a purchase occurred.

Setup persists its actual current page name in the existing `setupStep` field. Its validator accepts those names as well as all legacy X1–X6 values and `done`. Earlier pages passed with Not now remain passed after a relaunch; granted prerequisites still come from current permission state. Completed Setup is not replayed after renewal. Finishing Setup dismisses the previous stack and replaces it with the always-available launch route after admission changes the protected route set; a departing Setup must not restart checkout. This removes previous checkout pages from history, including native swipe-back from Home. App admission rechecks use the same public entry when they admit an account again. The public Expo Router dismissal and replacement APIs avoid assumptions about internal navigator names. Sign-in and Setup disable native dismissal gestures and retain their explicit controls.

The main app exposes View plans under Settings → Manage subscription. An admitted user opens the `in_app` Paywall while retaining the existing app Journey. Close returns to the previous app screen. A verified purchase or Restore returns there after account-bound admission refresh; a failed check cannot create admission or discard unfinished purchase recovery. The Paywall is reachable without app admission because it grants no app access. Its cold-link entry waits for store hydration, purchase recovery and returning-account verification before offering checkout. It runs entry effects only while focused. Sign-in removes it from navigation history so a dormant checkout cannot claim an account detour's checkpoint; verification keeps the launch gate until the selected account is settled. The same admitted route handles a Paywall deep link or trial-reminder notification.

## Context

The 2026-10-21 payment incident established that the Paywall's Close restarted Onboarding. The navigation audit found additional replay paths: launch ignored the saved page; rendering Welcome overwrote it; sign-in exits and Create account chose O01/O04 directly; and a persisted or linked P rendered as an Onboarding page or restarted at O01. Answers survived these paths, but the screen checkpoint did not. The `in_app` placement existed in the adapter but no main-app screen loaded it; Settings exposed only App Store management and Restore.

This completes the saved-page follow-up in ADR 0061. It supersedes the Welcome-return navigation choices of ADR 0050 and ADR 0087 when they would discard progress. It does not change authentication, subscription ownership, pricing, analytics contracts, storage keys or versions, or the cold-start-only OTA policy in ADR 0070. The meaning of the existing `complete` field becomes completion of Onboarding rather than completion of Setup; `setupComplete` continues to own the latter. Older stores with `step: P` are recognized even before the milestone is written.

The lead separately owns the Paywall Close destination and best-effort analytics integration during purchase/Restore. These changes preserve the checkpoint around either Close destination and do not edit those handlers.

## Consequences

Returning to checkout takes one continuation tap after an exit, and interruption never requires replaying questions. The navigation milestone is deliberately not proof of payment. The existing on-device answers and staged Conditions remain local and are not logged or sent to the server.

An interrupted provider prompt can still require a fresh native prompt, and text or an unsubmitted code held only by a sign-in component is not restored. The persisted email challenge continues to resume its code screen under ADR 0086. Simulator proofs establish navigation and saved local state, not real StoreKit purchase or vendor availability.

## References

- [0061](0061-stay-signed-in-and-admitted-across-launches.md): accepted; saved Onboarding page follow-up completed here, pending owner approval.
- [0050](0050-hard-paywall-journey-and-account-bound-admission.md), [0086](0086-verified-account-recovery-and-checkout-connection.md), [0087](0087-recoverable-subscription-verification.md): admission and recovery rules retained.
- [0070](0070-ota-applies-on-cold-start.md): accepted and unchanged.
- [0078](0078-adapty-onboarding-trial-assignment.md), [0079](0079-install-split-onboarding-trial-assignment.md): offer sessions may rebind product handles after identity changes, independently of saved navigation.
- [Expo protected routes](https://docs.expo.dev/router/advanced/protected/): changing a route guard removes its navigation history; the saved checkpoint is needed when sign-in replaces the Paywall.
- `onboarding/onboardingStore.ts`, `onboarding/lib/useOnboarding.ts`, `launch/BootGate.tsx`, `launch/lib/bootDestination.ts`, `app/sign-in.tsx`.
