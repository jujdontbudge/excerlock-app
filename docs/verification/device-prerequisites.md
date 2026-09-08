# Device verification: what Johan sets up first

Everything on this page needs a human with an account. Do it before the sitting in
`device-runbook.md`; each item says where the setting lives and how to tell it is done. Secrets go into
`~/.excerlock/env` (mirrored to `/etc/excerlock/env` on the VPS), never into the repo or a GitHub issue.

Dashboard paths were written from the vendors' documentation on 2026-09-07. If a menu has moved, the
item name is the thing to search for.

## 1. The phone

- [ ] iPhone on iOS 17.4 or later (26.x preferred, it is what the simulator runs). Note the exact version;
      the results table records it.
- [ ] Developer Mode on: Settings › Privacy & Security › Developer Mode › on, then restart when asked.
- [ ] Paired and trusted with the Mac over USB. `xcrun devicectl list devices` shows it; copy the identifier
      (the UDID-style value), the runbook calls it `<udid>`.
- [ ] The phone is registered on the Apple Developer account: Xcode › Settings › Accounts shows the team
      `AX3C2B78YD`, and the first `expo run:ios --device` registers the phone automatically. If it does not,
      developer.apple.com › Certificates, Identifiers & Profiles › Devices › + with the UDID.
- [ ] The App ID `com.johansardar.excerlock` has Family Controls (distribution), HealthKit, App Groups
      (`group.com.johansardar.excerlock`) and Sign in with Apple enabled: developer.apple.com › Identifiers ›
      the App ID › Capabilities. Family Controls on a **physical phone** needs Apple's approval of the
      distribution entitlement request; the development entitlement is enough for this runbook.
- [ ] Screen Time on the phone: Settings › Screen Time is on with **no** Screen Time passcode (a passcode
      makes FamilyControls report restricted and the app cannot ask). No device-management profile.
- [ ] Two real apps you are willing to have blocked during the sitting (the runbook uses Safari and one
      social app) and one game or news app you will use for ten minutes for the usage row.
- [ ] Apple Watch paired if you have one, otherwise a Health-writing app (Strava, Nike Run Club) for the run
      row. Health › Sharing › Apps must show ExcerLock after the setup step grants it.
- [ ] A saved gym to travel to, a treadmill to prop the phone on, and a way to record the screen
      (Control Centre › Screen Recording) for the ceremonies.

## 2. Supabase dev project `hqgqhefftjxwdhqeushr`

Dashboard: `https://supabase.com/dashboard/project/hqgqhefftjxwdhqeushr`.

- [ ] **Anonymous sign-ins on.** Authentication › Sign In / Providers › "Allow anonymous sign-ins" on. Done
      when the toggle is green.
- [ ] **Apple provider.** Authentication › Sign In / Providers › Apple › enabled. Native sign-in from the app
      sends an identity token whose audience is the **bundle id**, so `com.johansardar.excerlock` must be in
      the "Client IDs" (comma-separated) field; the Services ID is only needed for web OAuth. No secret key
      is required for the native flow. Done when the provider row shows Enabled and the Client IDs field
      contains the bundle id.
- [ ] **Google provider.** Two halves:
      1. Google Cloud console › APIs & Services › Credentials › Create credentials › OAuth client ID › type
         **iOS**, bundle id `com.johansardar.excerlock`. Copy the client id (ends in
         `.apps.googleusercontent.com`). Create a second client of type **Web application** if the Expo MCP
         guidance for the chosen library asks for a server client id.
      2. Supabase › Authentication › Sign In / Providers › Google › enabled; paste the iOS client id (and the
         web client id) into "Client IDs"; turn on "Skip nonce checks" only if the chosen native library
         cannot forward the nonce (the P2-T01 README says which). Done when the row shows Enabled.
      Put the iOS client id and its reversed form (the URL scheme) in `~/.excerlock/env` as
      `GOOGLE_IOS_CLIENT_ID` and `GOOGLE_IOS_URL_SCHEME`; the app config plugin reads them.
- [ ] **Email OTP.** Authentication › Sign In / Providers › Email › enabled, "Confirm email" can stay on,
      and Authentication › Email Templates › Magic Link must contain `{{ .Token }}` so the mail carries a
      six-digit code, not only a link. Rate limit: Authentication › Rate Limits › emails per hour; the free
      SMTP allows 2 per hour, which is too few for a sitting that signs in three times. Either attach the
      Resend SMTP (Project Settings › Authentication › SMTP Settings; the Resend key is already in
      `~/.excerlock/env`) or raise the limit. Done when a test email from Authentication › Users › Send
      magic link arrives with a code.
- [ ] **Redirect URL** for the OTP mail: Authentication › URL Configuration › Redirect URLs contains
      `excerlock://`. Only needed if the mail's link is tapped instead of the code being typed.
- [ ] Keys: Project Settings › API. `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or the publishable key) already
      exist in `~/.excerlock/env`; confirm they belong to this project ref.

## 3. App Store Connect sandbox

Dashboard: `https://appstoreconnect.apple.com`.

- [ ] **Sandbox tester.** Users and Access › Sandbox › Testers › +. Use a fresh email you can read (a
      `+sandbox` alias works), a password you will type on the phone, and the same storefront as the phone.
      Done when the tester appears in the list.
- [ ] **Sign the phone into the sandbox account.** Settings › App Store › scroll to Sandbox Account › sign in
      with the tester. Do **not** sign the main Apple ID out. Done when "Sandbox Account" shows the tester
      email.
- [ ] **Subscription renewal speed.** Users and Access › Sandbox › Testers › the tester › Edit › Subscription
      Renewal Rate: set to the fastest option (a 1-year subscription renews every hour in sandbox by
      default; the 7-day trial becomes 3 minutes). The runbook's lapse row waits for the trial to expire, so
      write down which rate you chose. On the phone, Settings › App Store › Sandbox Account › Manage also
      lets you cancel the sandbox subscription, which is how the lapse row is driven.
- [ ] **Products exist and are ready for sandbox.** Apps › ExcerLock › Subscriptions: both groups (A and B)
      with `com.johansardar.excerlock.premium.a.annual`, `.a.monthly`, `.b.annual`, `.b.monthly` (the
      win-back offers can stay). Each product needs at least one localisation and a price, and the state must
      be "Ready to Submit" or later for sandbox purchases to load. `asc` CLI: `asc iap list` per the
      `asc-cli-usage` skill. Also the Paid Apps agreement must be active: Business › Agreements.
- [ ] **StoreKit configuration is not used.** The device run must hit the real sandbox, so no
      `.storekit` file is selected in the scheme. If `expo run:ios` picks one up, delete it from `ios/`.

## 4. Adapty

Dashboard: `https://app.adapty.io`. CLI: `adapty` (per `TOOLING.md`).

- [ ] **App Store credentials.** App settings › iOS SDK: bundle id `com.johansardar.excerlock`, the App Store
      Connect API key (Issuer, Key ID, .p8) for the In-App Purchase key that is already in `~/.excerlock/env`
      as `ASC_INAPP_KEY_ID`, and the App Store Server Notifications URL copied back into App Store Connect ›
      Apps › ExcerLock › App Information › App Store Server Notifications (production **and** sandbox URL).
      Done when Adapty shows a green tick on the iOS settings page.
- [ ] **Products, access level, placements.** Products: the four subscription products above mapped to the
      access level `premium`. Placements `onboarding` and `in_app` each with a Paywall Builder paywall
      attached and the audience "All users". The `onboarding` paywall's Close button is disabled (hard
      paywall); the `in_app` paywall keeps its Close button. Both carry tappable Terms of Use and Privacy
      Policy links, the price and the renewal disclosure (App Review 3.1.2). Done when
      `adapty placements list` shows both with a paywall.
- [ ] **Sandbox purchases.** Nothing to enable: Adapty treats a purchase from a sandbox account as sandbox
      automatically and shows it in Profiles with an "Sandbox" badge. After the runbook's purchase row, the
      profile must show `customer_user_id` equal to the Supabase uid.
- [ ] **PostHog integration** (decision D9): Integrations › PostHog › on, with the project API key, so
      subscription lifecycle events arrive from Adapty and not from the app. Done when a sandbox event shows
      up in PostHog after the purchase row.
- [ ] **Webhook to the VPS** unchanged from before; confirm Integrations › Webhook still points at
      `https://api.excerlock.com/v1/...` with the secret in `ADAPTY_WEBHOOK_SECRET`.
- [ ] `EXPO_PUBLIC_ADAPTY_KEY` in `~/.excerlock/env` is the **public** SDK key from App settings › General.

## 5. PostHog and Sentry

- [ ] PostHog project for ExcerLock exists and `EXPO_PUBLIC_POSTHOG_KEY` / `POSTHOG_HOST` in
      `~/.excerlock/env` point at it. The runbook checks events with the PostHog MCP; nothing else to set up.
- [ ] Sentry org `edge-ix`, project `excerlock-mobile`; `SENTRY_DSN_MOBILE` in `~/.excerlock/env`. The test
      crash row looks for the event there.

## 6. Local build environment

- [ ] `~/.excerlock/env` holds every key above. `npx tsx scripts/check-env.ts` from the repo root reports no
      missing row (the vendor row is historical and may stay missing).
- [ ] Xcode with the iOS 26 SDK, CocoaPods, and the same Node the repo uses. `npm ci` at the root has run
      (P2-T03 adds the native modules and the `patch-package` postinstall).
- [ ] No leftover `EXPO_PUBLIC_*` bypass in `.env` files or in any global simulator tool config
      (`~/ios-app-pitfalls/PITFALLS.md`, "`EXPO_PUBLIC_*` overrides poison tests and dev runtimes").
- [ ] `evidence/P2-T11/` exists at the repo root (create it; recordings stay local, the text index is
      committed).

## 7. Gates the build must have before the sitting can start

These are owned by the Phase 2 tasks, not by Johan; the runbook cannot run until they are on
`rebuild/phase-2`:

- P2-T03: native modules, the three extensions, the diagnostics recorder and route, the harness root
  behind `EXPO_PUBLIC_TEST_HARNESS=1`, and the event vocabulary in `diagnostics-events.md`.
- P2-T04: the Screen Time adapter and extension records.
- P2-T05: steps, walking, gym, health adapters and the gait permission read.
- P2-T06: Adapty Builder adapter. P2-T09: the three notifications. P2-T01: Supabase auth. P2-T08: sync.
- `createRuntime('real')` assembles the adapters (today it throws "Real runtime is unavailable in Phase 1").
