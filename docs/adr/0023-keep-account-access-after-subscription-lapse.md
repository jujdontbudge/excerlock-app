---
status: accepted
date: 2026-09-10
---

# 0023: Keep account access after subscription lapse

## Decision

Once setup is complete, the tab shell and Settings routes remain reachable for every entitlement state, including `expired`, `billingIssue`, and transient `unknown`. A confirmed lapse still clears native enforcement authority; it does not erase local data or remove access to account deletion, support, export, legal information, or purchase restoration.

The onboarding paywall remains a non-dismissible gate until setup is complete. After setup, `/paywall` is an in-app modal with an accessible Close action. A transition into an expired or billing-issue state presents that modal once; dismissing it returns to the existing app instead of starting a redirect loop. A cold launch with completed setup opens Home rather than the paywall.

## Context

The original root navigator used one entitlement guard for both premium enforcement features and the entire post-setup application. When a trial expired or billing entered an issue state, Expo Router removed the tab and Settings routes and the boot destination always selected `/paywall`. Although the subscription screen supported restore, its isolated test did not prove that a lapsed user could reach Settings, support, or account deletion. This violated the App Review readiness requirement that subscription lapse must never trap the user.

Entitlement remains the authority for paid enforcement and for completing pre-setup purchase. Account/privacy access is a separate lifecycle concern and must survive subscription changes.

## Consequences

Completed users can inspect the app and exercise privacy/account rights without paying. Builder and unlock routes remain entitlement-protected, and the existing enforcement projection continues to clear shields on confirmed lapse; this decision grants no premium or sensor bypass. Router tests cover boot, modal dismissal, one-time transition presentation, and Settings-to-deletion reachability for expired, billing-issue, and unknown states. A rebuilt Release still requires native navigation and accessibility verification.

## References

- `plans/ship/05-review-readiness.md` sections B and C
- `app-next/src/features/launch/RootNavigator.tsx`
- `app-next/src/onboarding/bootDestination.ts`
- `app-next/src/runtime/projectEnforcement.ts`
- ADR 0012, persisted detection and conditional watchdog
