## Phase 2: Ask three questions

Use `AskUserQuestion` for all three together in one call:

1. **Paywall approach** — which do they want?
   - **Paywall Builder** (recommended): Adapty renders paywalls in a no-code visual editor; no paywall UI to build
     - **iOS, Android, React Native, Flutter, and Kotlin Multiplatform:** Present this option as **Flow Builder** instead. Flow Builder is the v4 successor to Paywall Builder and also supports onboarding flows. The `paywallApproach` state value for this choice on these platforms is `flow_builder`. Note: Flow Builder requires the platform SDK **v4+**; see Stage 1 in `references/ios.md`, `references/android.md`, `references/react-native.md`, `references/flutter.md`, or `references/kmp.md`.
   - **Custom paywall**: User builds their own paywall UI; Adapty fetches products and handles purchases
   - **Observer mode** *(not recommended for new projects)*: Keep existing StoreKit/Billing purchase infrastructure unchanged; Adapty only tracks events. Limitations: no paywall management, no A/B testing, manual transaction reporting required. Only suitable if replacing a purchase system is not feasible.

2. **Integrations** — do they use any of the following? (select all that apply, or "none")
   - Analytics: Amplitude, Firebase/Google Analytics, Mixpanel, AppMetrica, PostHog
   - Attribution: AppsFlyer, Adjust, Branch, Apple Search Ads, Airbridge, Singular
   - Messaging/CRM: Braze, OneSignal, Pushwoosh
   - Other: Webhook (custom backend), S3/Google Cloud Storage export, Slack notifications

   Save the answer — it determines whether Stage 3.5 (integrations) runs during implementation.

   Two different things are easy to confuse here, and they point at different docs:
   - **Adapty → the user's backend** (they want to be told when a subscription renews, cancels, refunds): webhooks — https://adapty.io/docs/set-up-webhook-integration.md, https://adapty.io/docs/webhook-event-types-and-fields.md
   - **The stores → Adapty** (so Adapty learns about renewals at all; a release-checklist item, not an integration the user picks): server notifications — https://adapty.io/docs/enable-app-store-server-notifications.md, https://adapty.io/docs/enable-real-time-developer-notifications-rtdn.md

3. **Adapty app** — do they already have an app created in the Adapty dashboard, or should a new one be created?
   - **I already have an app** — you'll fetch the list in Phase 3 and ask them to pick one
   - **Create a new app** — you'll create one in Phase 3

**State update:** Set `paywallApproach` to `paywall_builder` (or `flow_builder` on iOS, Android, React Native, Flutter, or Kotlin Multiplatform), `custom`, or `observer`. Set `integrations` to the array of selected integration keys (e.g. `["amplitude", "appsflyer"]`), or `[]` if none. Set `appPreference` to `existing` or `new`. Set `phasesCompleted = 2`.

Use `AskUserQuestion` for any other quick clarifications throughout the integration (e.g., "Did the build succeed?", "What's your App Store product ID?"). Never ask for values that can be retrieved via CLI.

