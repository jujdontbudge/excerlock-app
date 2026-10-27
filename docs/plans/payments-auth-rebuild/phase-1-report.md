# Phase 1 verification report

Simulator: worker `ExcerLock-payauth` (iOS 26.4, slim), Metro 8092, existing Debug build 24 (runtime 8). No native rebuild. Evidence under `.excer/proof/<feature>/<time>/` in this worktree (not committed).

## Fixes found by running the app

| Problem | Fix |
|---|---|
| The journey checked expiry against the wall clock while the paywall used the runtime clock. A successful purchase in a scenario stayed on the Paywall. Same clock in production, but two clocks for one rule. | `journey` reads `runtime.clock`. |
| A purchase that succeeded without Premium on the returned profile ran a restore and told a paying customer "No purchase found". | Paywall shows "Payment received. Confirming your purchase…" with Restore and continues by itself when Adapty reports Premium. |
| When a profile with Premium arrived while the Paywall was open (renewed while closed, network back), nothing moved the person on. | The Paywall continues whenever access becomes active. |
| An active, auto-renewing profile whose renewal date passed while offline locked the subscriber out. | Three days of grace past the renewal date for `willRenew` profiles (`journey.eligible`). |
| Setup stayed blank when the account id was not loaded yet; the id was read once and never updated. | Setup commits the staged plan without waiting; the id is read reactively. |
| Complimentary Premium lived only in memory and any non-OK API answer removed it. A relaunch or offline launch could open the Paywall for a complimentary user. | Grant persisted in the `entitlement` store (additive optional field, same key). Only expiry or another account ends it. |
| Integration identifier timeouts were reported as `unknown`. | Reported as `timed_out` / `timeout`. |
| Welcome → Sign in with a remembered email showed only the stale email, no Apple or Google. | `requireFreshSignIn` restored on the sign-in route (Phase 1 had removed it with `signInRequired`). |

## Proofs

Updated to the new behavior: no forced sign-in, no recovery journal, no trial arms, no server admission. Deleted: preflight, journal and response-recovery proofs; B arm and fallback-placement proofs; `sign-in-after-paywall-is-sign-up`; the complimentary local-harness proofs (harness was deleted in Phase 1). Added: `offline-renewal-due-keeps-access` (scenario `returning-offline-renewal-due`).

Passed (focused, one at a time):

- paywall: premium-headline, trial-plan-rows, billing-disclosures, purchase-events-use-production-analytics, identity-purchase-to-setup, identity-purchase-cancelled, identity-purchase-pending, identity-purchase-success-without-access, identity-purchase-error-retries-original-checkout, identity-purchase-double-tap-is-serialized, identity-existing-subscription-checkout-reconciles, identity-purchase-survives-integration-failure, identity-purchase-survives-integration-hang, identity-restore-not-found, identity-restore-to-setup, restore-failure-retries-original-account, restore-wrong-store-account-stays-unpaid, identity-sync-retry, identity-slow-cold-start, identity-plans-retry, identity-anonymous-retry, signin-first-purchase-needs-no-second-signin, checkout-analytics-throw/reject/hang, checkout-selects-trial-product, offer-fallback-outage-keeps-retry, billing-issue-after-grace-opens-paywall, lapse-in-session
- launch: first-launch-welcome, subscriber-opens-home, sign-in-survives-relaunch, reinstall-keychain-stays-welcome, offline-renewal-due-keeps-access, offline-expired-profile-opens-paywall, returning-unpaid-to-paywall, returning-expired-to-paywall, unpaid-paywall-close-returns-welcome, access-holds-while-open, long-setup-keeps-access
- onboarding: resume-walking-goal, plan-staged-before-admission, offer-a-three-days, offer-a-intro-ineligible, offer-a-paywall-close-returns-reminder, paywall-relaunch-returns-to-checkout, offer-a-paywall-close-relaunch-returns-reminder
- setup: post-purchase-setup-layout, welcome-sign-in-is-returning, start-over-sign-in-keeps-onboarding-plan, sign-in-provider-options, returning-session-opens-home
- account: signed-in, anonymous, unpaid-account-recovery

## Known failures, not fixed here

- `launch/all-protected-deep-links-blocked`, `launch/remote-flags-not-authority`: an unpaid user can deep-link to `/diagnostics/bank-drain`. The route exists only in development builds (`__DEV__`); same on `main`. Not a production issue.
- `setup/sign-out-relaunch-stays-welcome`: after sign-out and a relaunch, the cached Premium profile opens Home. Sign-out is rebuilt in Phase 2 (quarantine cached entitlement, continue as a fresh guest).
- `account/anonymous`, `account/unpaid-account-recovery`: the dev harness signs every paid scenario in with Apple, and Account and help asks a remembered (not freshly signed-in) account to sign in again. Both are the old session model; Phase 2 replaces it.
- Not verified: complimentary Premium on the simulator (needs the Phase 2 lab), real StoreKit, Adapty, Supabase (real-iPhone suite).

## Simulator gotchas found

- A fresh worker simulator has no location; the gym fake waits for a fix and `excer demo` silently keeps the previous scenario. Set a location first.
- The dev client's floating tools button sits on the Paywall's Close button. Turn it off with `defaults write com.johansardar.excerlock EXDevMenuShowFloatingActionButton -bool false` on the simulator.
