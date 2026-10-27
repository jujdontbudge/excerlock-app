# Phase 2 verification report: accounts

Simulator: worker `ExcerLock-payauth` (iOS 26.4, slim), Metro 8092, existing Debug build 24 (runtime 8). No native rebuild. Evidence under `.excer/proof/<feature>/<time>/` in this worktree (not committed).

## What changed

- Guest first: every install is a Supabase anonymous account. No sign-in gate, no remembered sign-in.
- Save your account (Settings → Account, Account and help): Apple and Google `linkIdentity` on the same id; email `updateUser` + `verifyOtp` `email_change` + refresh, same id.
- An identity that already has an account returns `existing-account`. The screen asks "You already have an account"; only "Sign in to my account" switches. Welcome → Sign in switches without asking.
- A switch from a guest carries Conditions and onboarding progress to an account with no data on this iPhone, then Adapty identifies the account and access refreshes.
- Sign out and Delete account reset onboarding and start a fresh guest.
- `identityCoordinator` replaced by `identitySync` (about 90 lines). The identity lab is a small scripted Supabase: one guest, optionally one existing account (`existing: { provider, paid }`).
- ADR 0091 supersedes 0049, 0050, 0059, 0061, 0078, 0079, 0086, 0087, 0088 and the sign-in part of 0043.

## Fixes found by running the app

| Problem | Fix |
|---|---|
| Account and help → Save your account opened sign-in mode, which would switch to an existing Apple ID without asking. | Opens save mode. |
| Save your account in Settings did nothing for a paid guest: the sign-in screen was only allowed in the sign-in phase. | Allowed inside the app too. |
| Sign out in the demo harness left access and onboarding in place and showed Home. | Fake auth resets them like the real adapter. |

## Proofs passed (focused, one at a time)

- account: save-with-apple-keeps-account, save-with-google-keeps-account, save-with-email-keeps-account, existing-apple-asks-before-switching, existing-apple-switch-keeps-plan-and-purchase, welcome-sign-in-existing-email-switches, rate-limit-retains-verifiable-code, provider-attempts-save-once, apple-unknown-cancel-retry-stays-on-signin, welcome-email-code-allows-new-account, welcome-sign-in-code-verifies-itself, signed-in, anonymous, anonymous-save-opens-save, email-entry, unpaid-account-recovery, recovery-without-subscription, sign-in-layout
- setup: sign-out-relaunch-stays-welcome (Phase 1 known failure, now fixed), welcome-sign-in-is-returning

## Not verified here

- Complimentary Premium on the simulator (no lab proof yet; the grant is persisted per Phase 1).
- Real Apple ID, Google, email delivery, StoreKit and Adapty access sharing: the real-iPhone test.
- Supabase settings this needs (anonymous sign-ins, manual linking, email-change template with `{{ .Token }}`) are dashboard changes awaiting go-ahead.
