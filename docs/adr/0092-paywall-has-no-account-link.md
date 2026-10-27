---
status: accepted
date: 2026-10-27
---

# 0092: The Paywall has no account link

## Decision

The Paywall shows nothing above the headline and no link to an account, help or sign-in screen. Its only exits are Close (on the headline's first line, right edge), the plan pills and Continue, and the bottom row: Terms of Use, Restore purchases and Privacy Policy.

Account deletion, data export, subscription management, support and legal stay reachable without a subscription through one route: Restore purchases. When Restore finds no purchase, a sheet says "No purchase found" with OK and "Account and deletion", which opens the restricted account screen (`/recovery`). A paying account reaches the same things through Settings.

`./excer check` enforces this (`paywall-no-account-link`).

## Context

Johan banned the "Account and help" link on the Paywall on 22 October ("why the fuck is account and help on top left") and again on 24 October ("Please get rid of account and help"). Both fixes stayed unshipped: the 22 October one as uncommitted edits in the main checkout, the 24 October one on branch `paywall-no-account-link` (`1e088f0e`), never merged. The 27 October payments and auth rebuild (ADR 0091) was built from `main`, kept the link, routed guest "Save your account" through it, and shipped it to runtime 8.

The link was added by an agent on 28 September (`0ca8b01d`, ADR 0050) with no request from Johan. ADR 0050's reason, "account deletion, purchase restoration, support and legal access remain outside the paid routes", does not need a link at the top of the Paywall. Apple requires Restore Purchases on the Paywall and account deletion somewhere in the app (guideline 5.1.1(v)). On 24 October a buyer left the Paywall through the link, reached Sign in, closed it and landed on the first onboarding screen.

Alternative considered: keep the link only for the win-back Paywall or only for saved accounts. Rejected: the Paywall is one screen, and every variant of the link has leaked to new buyers.

## Consequences

- New buyers have no way off the Paywall except Close.
- An unpaid guest cannot save an account before buying; Save your account is in Settings → Account after purchase, and Welcome → Sign in still serves existing accounts.
- A saved account whose subscription lapsed reaches deletion through Restore purchases → No purchase found → Account and deletion. App Review notes must say so.
- Any future change that adds a header, account, help or sign-in link to the Paywall fails `./excer check`.

## References

- Partly supersedes ADR 0050 (the Paywall account link). ADR 0091 is unchanged.
- `app-next/src/packages/paywall/lib/PaywallScreen.tsx`, `app-next/src/packages/paywall/PaywallSlot.tsx`, `tools/excer/checks/boundaries.ts`.
- T3 thread "Unknown Download Question" (24 October), commit `1e088f0e`.
