---
status: accepted
date: 2026-10-17
---

# 0084: Meta and TikTok ad events, one owner per event

## Decision

- **One owner per event.** The app sends the events in the table below to the Meta SDK and the TikTok SDK. Adapty's server sends to Meta only what happens while the app is usually closed. Nothing reaches TikTok from a server in v1.

  | Event | When | Owner | Meta | TikTok |
  |---|---|---|---|---|
  | Install, app open, day-2 return | automatic | Meta SDK, TikTok SDK | `fb_mobile_activate_app` | `InstallApp`, `LaunchAPP`, `2Dretention` |
  | Onboarding finished | onboarding hands off to the paywall (`move('P')`), once per install | app | `fb_mobile_complete_registration` | `Registration` |
  | Paywall shown | each paywall load, beside `paywall_viewed` | app | `fb_mobile_content_view` | `ViewContent` |
  | Free trial started | `makePurchase` succeeded and the StoreKit transaction applied a free-trial introductory offer; once per account and per original transaction | app | `StartTrial`, no value | `StartTrial`, no value |
  | Paid start without a trial | `makePurchase` succeeded, paid, and the account had no access before; once per account and per original transaction | app | `Subscribe` + `_valueToSum` + `fb_currency` | `Subscribe` + `value` + `currency` |
  | Trial converted, renewals | while the app is usually closed | Adapty → Meta, ATT-allowed users only | `fb_mobile_purchase` with revenue | not sent in v1 |
  | Refunds, expiries, billing issues | server | Adapty → Meta custom events | Adapty's names | not sent in v1 |

- **Allowed properties.** Subscribe carries `value` and `currency`; every other event carries none. No health, motion, step, place, gym or Screen Time data, and nothing derived from it, reaches either platform (App Review 5.1.3). `./excer check` (`ad-attribution`) pins the allow-list, the native property keys and the SDK safety settings, and `allowListed` rejects anything else at runtime.
- **The transaction decides.** Adapty's `makePurchase` result carries the signed StoreKit transaction (`ios.jwsTransaction`). Its payload says whether a free-trial offer applied (`offerType` 1 with `FREE_TRIAL`), what was charged (`price` in milliunits, `currency`), the `originalTransactionId`, the `transactionReason` and the environment. The signature is not verified because nothing is granted from it. A renewal, a product mismatch, a plan change (access before the purchase), or an `Xcode` StoreKit test transaction sends nothing.
- **At most once.** A conversion first claims both StartTrial and Subscribe keys under the account and the original transaction, and is sent only if none existed. This prevents a later paid re-purchase after a counted trial from being reported as a new acquisition. Existing v1 keys remain readable. The ledger survives a reinstall. A crash between the write and the send drops the event; it is never sent twice. Restores never send. A pending (Ask to Buy) purchase is dropped, not sent later.
- **Interrupted purchases.** Before `makePurchase`, a purchase intent (product, price, the recovery journal's operation id) is saved. If the app dies before the result arrives, the next launch's first Adapty profile with active access for that account, while the recovery journal still holds that purchase, sends StartTrial once only if an active free trial is still confirmed. Without the signed transaction, paid access cannot distinguish a direct paid purchase from an already converted trial; that ambiguous interrupted conversion is knowingly dropped.
- **App Tracking Transparency.** One system prompt, when onboarding hands off to the paywall, and only in builds with real credentials. The answer is re-read on every foreground. Saying no changes nothing in the app, and both SDKs still receive every event:
  - Meta gets `isAdvertiserIDCollectionEnabled = granted`. Since SDK 17 the SDK reads the ATT status itself, so `setAdvertiserTrackingEnabled` is not called.
  - TikTok gets nothing. Its `setTrackingEnabled(false)` would stop **every** event, so it is never called.
- **Meta SDK.** A small Expo module (`modules/excerlock-meta-events`) wraps `FBSDKCoreKit` 19.0.0, not `react-native-fbsdk-next`. Its app delegate subscriber starts the SDK at launch and forwards URLs and Universal Links (AEM), but only when `Info.plist` carries a real `FacebookAppID`. Settings in `plugins/withAdAttribution.js`:
  - `FacebookSKAdNetworkReportEnabled` false, because TikTok owns SKAdNetwork conversion values.
  - Auto-logging stays on for install and activate events.
  - `FBSDKAutoLogMetaDataEnabled` and `FBSDKAutoLogProductImprovementEnabled` false. Before SDK initialization, the subscriber also sets `isMetaDataCollectionEnabled`, `isAutoLogProductImprovementEnabled` and `isSKAdNetworkReportEnabled` false, overriding persisted SDK preferences. Screen-title/AppLink metadata and product-improvement collection remain disabled; TikTok remains the sole SKAdNetwork owner.
- **TikTok SDK.** `modules/excerlock-tiktok-events` wraps `TikTokBusinessSDK` 1.7.2.
  - `disablePaymentTracking`, because Adapty owns StoreKit.
  - SKAdNetwork support stays on: TikTok owns conversion values.
  - Debug mode runs only when the verified App Store environment is not production (TestFlight, Xcode, dev). Those events are test events and never reach TikTok reporting. An App Store install whose environment cannot be verified skips TikTok for that launch rather than guess.
  - The SDK's server config can turn StoreKit observation back on once per launch (`auto_track_Payment_enable`). A pinned CocoaPods post-install source patch makes the remote-config assignment respect an explicit disabled paymentTrackingStatus before StoreKit observation starts. It fails the build if the expected 1.7.2 source changes. The module retains the two-minute polling guard as defense in depth. Enhanced data postback is explicitly disabled, and the pinned patch disables the independent remote screenshot switch, so neither path can capture screens or interactions.
- **Native runtime 7 minimum; current runtime 8.** Meta, TikTok and ATT add native modules in runtime 7. Runtime 8 (1.0.2 build 24) backports scene-aware Apple sign-in presentation; its JavaScript remains runtime-7 compatible, and `--runtime 7` keeps builds 22/23 publishable. This source cannot be delivered to runtime 4–6 binaries; app config and the OTA command reject those targets. Historical binaries need their historical source revision.
- **Credentials.** `EXPO_PUBLIC_META_APP_ID`, `EXPO_PUBLIC_META_CLIENT_TOKEN`, `EXPO_PUBLIC_TIKTOK_APP_ID` and `EXPO_PUBLIC_TIKTOK_APP_SECRET` come from EAS environment variables at build time (`config/environment.ts`). Values that are missing, placeholders or malformed leave that platform out: no Meta plist keys, no SDK start, no network call and no ATT prompt. These are client identifiers by design (the TikTok "App Secret" is the SDK's client access token); they ship inside the app. Changing them needs a new binary.
- **SKAdNetwork IDs.** Apple requires `SKAdNetworkItems` only in apps that show ads. The build still adds Meta's two published IDs, as Meta asks. TikTok publishes no list we could verify, so none is added.

## Context

Adapty forwards to Meta only for users who allowed tracking, and Meta's measurement for everyone else (AEM) counts events the Meta SDK logs in the app. Adapty has no TikTok app-events integration. Adapty's default Meta mapping turns one trial into `StartTrial`, `Subscribe` and `fb_mobile_purchase`.

`react-native-fbsdk-next` 13.4.3 was rejected for three reasons:

- It ships classic bridge modules. New Architecture crashes are reported in issues #643 and #654.
- Its app delegate subscriber always starts the SDK, so a placeholder build would call Meta.
- It does not forward Universal Links. It also pins `FBSDKCoreKit ~> 18.0`.

Facebook iOS SDK 19.0.0 was published as a stable release on 2026-10-16. On 2026-10-18 the owner’s marketing follow-up requested the current stable SDK because Events Manager reports the app as out of date. The published CocoaPods release supports iOS 15+, below this module’s iOS 17.4 floor. Adopt 19.0.0 with both plist opt-outs and explicit runtime opt-outs before initialization. The release adds screen-title/AppLink metadata collection controls and a separate product-improvement control; its changelog says product-improvement data collection is not yet implemented. Device/network proof remains a separate gate. Release source: https://github.com/facebook/facebook-ios-sdk/releases/tag/v19.0.0.

## Consequences

- Meta and TikTok learn which ad clicks became trials and first payments, for every user, without double counting from Adapty or the SDKs' own StoreKit observers.
- **Required dashboard settings** (marketing side):
  - Adapty → Facebook Ads: turn off `trial_started` and `subscription_started`; send `trial_converted` and `subscription_renewed` as `fb_mobile_purchase` only; keep refunds.
  - Meta app settings: "Log in-app events automatically" off. The SDK's purchase observer is controlled by this server setting.
  - TikTok Events Manager: in-app purchase auto-tracking off.
  - TikTok: upload the exact fine-value table in `docs/ad-attribution-setup.md`: Subscribe 63 > StartTrial 62 > Registration 3 > ViewContent 2 > InstallApp 1. This supersedes the original brief's trial-first ordering. The SDK reads the uploaded rules from `data.skan4_event_config`; no app CV table overrides them.
- **Accepted residuals:**
  - A purchase interrupted on one phone and completed for the same account on another phone before the first reopens can count twice.
  - Ask to Buy approvals are not counted.
  - Meta sandbox/development/TestFlight events are not marked as tests and can land in the live Meta dataset. Lack of an ad click does not isolate ingestion. Accepted by owner on 2026-10-18 (A14); no isolation release gate remains.
- **Owner acceptance (2026-10-18).** A3/A9/B9 accept the documented at-most-once policy and residuals: cross-device duplicates, Ask to Buy drops, ambiguous interrupted paid-access drops, and the claim-before-send crash window. This is not an exactly-once guarantee. A14 accepts sandbox events reaching Meta. B7 accepts TikTok debug/test mode in development, preview and TestFlight, including Release builds; verified production must keep it off. These policy decisions do not establish device emissions, dashboard receipt or purchase verification.
- **Device verification** needs a keyed development/preview build on a physical iPhone (TestFlight is not required): Meta Events Manager → Test events, TikTok Events Manager → Test events, Adapty Event Feed (sandbox), and a proxy capture of Meta and TikTok traffic.

## References

`app-next/src/packages/ad-attribution/`, `app-next/src/packages/subscription/lib/purchaseConversion.ts`, `app-next/modules/excerlock-meta-events/`, `app-next/modules/excerlock-tiktok-events/`, `app-next/plugins/withAdAttribution.js`, `tools/excer/checks/boundaries.ts` (`ad-attribution`), feature `ad-attribution`. Sources: https://adapty.io/docs/facebook-ads, https://adapty.io/docs/events, https://developers.facebook.com/docs/app-events/guides/aggregated-event-measurement/, https://developers.facebook.com/docs/SKAdNetwork, https://github.com/facebook/facebook-ios-sdk (v18.1.1, v19.0.0 CHANGELOG), https://github.com/tiktok/tiktok-business-ios-sdk (1.7.2), https://ads.tiktok.com/help/article/how-to-integrate-tiktok-app-events-sdk, https://developer.apple.com/app-store/review/guidelines/ (5.1.2, 5.1.3), https://developer.apple.com/documentation/storekit/configuring-a-source-app.

Local owner-device evidence builds may set the command-line Swift condition `EXCER_DEVICE_PROOF` to retain limited diagnostics in an embedded Release preview bundle. It is absent from normal Release/EAS configuration and does not change TikTok test-mode selection. ATT-authorized IDFA may be recorded only in private local evidence, never analytics. SDK invocation diagnostics do not prove network payload privacy or dashboard receipt.
