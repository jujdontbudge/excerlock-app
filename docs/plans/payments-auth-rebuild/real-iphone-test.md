# Real-iPhone test: payments and accounts

About 10 minutes on Johan's iPhone 13 with a Sandbox Apple ID. Run it after the Supabase and Adapty changes below and before the OTA. The simulator covers screens and state rules; this covers only what the simulator fakes: StoreKit, Apple ID, Google, email delivery, Adapty access sharing.

## Before the run

1. Dashboard state, checked 2026-10-27:
   - Supabase: done. Anonymous sign-ins and manual identity linking were already on; email auto-confirm turned off and the "Change email address" template now sends the six-digit `{{ .Token }}` (2026-10-27).
   - App Store Connect: done. Both `.t3` products have a 3-day free trial in all 175 territories; billing grace period turned on, 16 days, paid-to-paid renewals, production and sandbox (2026-10-27).
   - Adapty: `onboarding` and `in_app` already show one paywall to 100% (annual and monthly `.t3` with their no-trial twins, which the app pairs). Removing the twins waits until the OTA has shipped. "Sharing paid access between user accounts" is not visible to the CLI: check it is Enabled in the Adapty dashboard (App settings → General).
   - Sentry: alert rules on the `alert` tag still to create in the dashboard; the CLI logins lack the alert-write scope.
2. On the iPhone: Settings → Developer → Sandbox Apple Account, signed in with a fresh Sandbox tester. A second Sandbox tester is not needed.
3. Make one existing ExcerLock test account with an email Johan can read (sign in with that email once in a Debug build, then sign out). That is account B.
4. Build: a Debug dev client of branch `rebuild/payments-auth` installed with `xcrun devicectl device install app`, loading JS from this worktree's Metro, pointed at production Supabase, Adapty sandbox and `api.excerlock.com` (or a local server). The OTA itself is never used for the test.

## Steps

| # | Do | Pass |
|---|---|---|
| 1 | Fresh install. Onboard, then buy the trial on the Paywall. | Straight into Setup, no sign-in screen. PostHog: `checkout_attempt_completed` outcome `success`. Note the account id (dev build: `/dev`; or the server log's `user` on `PUT /v1/user`). |
| 2 | Settings → Account → Save your account → Continue with Apple. | "Account saved". Same account id as step 1. Still Premium. PostHog: `auth_completed` `save` / `saved`. Supabase: the user has an `apple` identity and `is_anonymous = false`. |
| 3 | Settings → Account → Sign out. On Welcome, Get started and onboard again to the Paywall, then Account and help → Account and deletion → Save your account → Continue with email → account B's email. | "You already have an account". Tap Sign in to my account, enter the code. Switched to account B; Premium is on (the Apple ID's purchase follows); the plan staged during the second onboarding is kept and Setup opens. PostHog: `auth_completed` `existing_account`, then `switch`. |
| 4 | Delete the app, reinstall, open the Paywall, tap Restore purchases. | Premium back without a second purchase sheet. PostHog: `checkout_attempt_completed` operation `restore`, outcome `success`. |

After the run: read PostHog (events above with their `attempt_id`), Sentry (no new `paid_locked_out` or `apple_sign_in_failed`) and the server log (`journalctl -u excerlock-api`, request lines with status 2xx).

Who does what: Claude builds, installs, launches and reads logs and dashboards, and judges pass or fail. Johan confirms each purchase sheet and sign-in prompt (Face ID and the Sandbox password cannot be automated).

## Results (2026-10-27, iPhone 13, iOS 27.0.1, Release build 24 on Sandbox)

- Step 1 passed. A guest bought yearly with the 3-day trial and went straight to Setup without signing in (`checkout_attempt_completed` success).
- Steps 2–3 passed. Save with Apple found the existing account; "Sign in to my account" switched without a second Face ID and kept the Condition and Premium.
- Step 4 passed. After delete and reinstall, Premium came back through Adapty access sharing without a Restore tap.
- Save with email passed. The code email arrived within seconds and the save kept the guest's account id (`auth_completed` email save saved on the same id).
- Notes: the Supabase session lives in the Keychain and survives app deletion; one `paywall_viewed` with placement `winback` fired while the account had Premium.
