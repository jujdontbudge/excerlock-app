---
name: simulator-purchase-needs-sandbox-tester
description: Sandbox purchases fail on the iOS simulator; a sandbox tester exists for real-iPhone tests; email sign-up code was broken by Supabase autoconfirm
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-01T02:18:07.667Z
---

- **Sandbox tester (made 2026-09-30 via the ASC website):** `johansardar77+excersbx1@gmail.com`, id 35cfe0ea-6e71-4fc0-a366-2307a5128d53, verified. The password is in the macOS Keychain under service `excer-sandbox-tester`. To reach ASC, use `chrome-devtools-axi profile-setup --refresh` (it's signed in), then the Sandbox page. Apple's API can't create testers.
- **The simulator can't do sandbox purchases.** Signing in from the purchase prompt fails with AMSErrorDomain "Password reuse not available for account", and Apple says this is expected. The simulator also has no Settings → Developer sandbox section. Real sandbox purchases need a physical iPhone.
- **What works on the simulator (2026-09-30):** `app-next/scripts/storekit-sim.sh` launches the app through Xcode with the local StoreKit file. Apple's "[Environment: Xcode]" sheet completes, Adapty reports access, and the app lands on sign-in. The scheme reference `../../storekit/ExcerLock.storekit` resolves when copies sit in both `ios/storekit` and `ios/ExcerLock.xcodeproj/storekit`. Don't reload the app with a dev-client URL while it runs under Xcode, because Expo crashes with "app context has been lost".
- **The real Sandbox API admits these test purchases (ADR 0055, deployed 2026-10-01 from commit 8c512f4d on revert/progress-graphic):** the app sends the Xcode entitlement JWS, and the `/testflight` sidecar verifies it against the pinned root `5d97603e…2705`. Full path proven: paywall → Subscribe → email sign-in → Home. Production still runs this branch's server until it's merged to main, so a deploy from main without 8c512f4d drops the feature.
- **The Env Catalog APPLE_SANDBOX_* values hold Johan's real Apple Account.** Don't use them.
- **Shortcut:** `excerlock://sample-paywall?stage=sign-in` opens the post-purchase sign-in step in the real app (commit 87f09e67).
- **Email sign-up for new users sends no code** (issue #147): production Supabase has `mailer_autoconfirm` on, and the email-change template lacks `{{ .Token }}`. Codes go through Resend SMTP. Read them with the Gmail tools using `johansardar77+<tag>@gmail.com` aliases.

**Why:** Johan wants payment and sign-in tested as close to real as possible, without being asked.
**How to apply:** Don't retry simulator sandbox purchases. For a real purchase, use a physical iPhone with the tester. Fix #147 before using email sign-in.
