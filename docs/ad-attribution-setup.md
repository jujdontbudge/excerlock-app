# Ad attribution setup — 2026-10-18

Native runtime: 8 (scene-aware Apple sign-in); minimum ad-attribution runtime: 7 (Meta/TikTok/ATT modules). This source supports `--runtime 7` for builds 22/23 and refuses OTA targets for older binaries.

Status: local static checks and 19 focused simulator proofs passed; physical-device and dashboard proof remains outstanding. The owner accepted the delivery and test-mode residuals on 2026-10-18 (ADR 0084). Keyed Debug and Release simulator artifacts built as 1.0.1 (21), runtime 7. Locally signed Debug initializes both real SDKs against the preview configuration, then the real runtime stops because simulator Core Motion is unavailable. No financial events or dashboard receipts were verified. No upload or dashboard mutation.

## TikTok SKAN manual table

Upload for TikTok app 7697759561817669653. TikTok is the only conversion-value owner; Meta's `FacebookSKAdNetworkReportEnabled` is false. Use event-only rules, leaving every optional USD revenue range blank. No revenue is attached to StartTrial. This follows the owner's revised priority: Subscribe > StartTrial > Registration > ViewContent > install.

| Fine CV | Event | Optional USD revenue range |
|---:|---|---|
| 1 | InstallApp | Leave blank |
| 2 | ViewContent | Leave blank |
| 3 | Registration | Leave blank |
| 4 | StartTrial | Leave blank |
| 5 | StartTrial | Leave blank |
| 6 | StartTrial | Leave blank |
| 7 | StartTrial | Leave blank |
| 8 | StartTrial | Leave blank |
| 9 | StartTrial | Leave blank |
| 10 | StartTrial | Leave blank |
| 11 | StartTrial | Leave blank |
| 12 | StartTrial | Leave blank |
| 13 | StartTrial | Leave blank |
| 14 | StartTrial | Leave blank |
| 15 | StartTrial | Leave blank |
| 16 | StartTrial | Leave blank |
| 17 | StartTrial | Leave blank |
| 18 | StartTrial | Leave blank |
| 19 | StartTrial | Leave blank |
| 20 | StartTrial | Leave blank |
| 21 | StartTrial | Leave blank |
| 22 | StartTrial | Leave blank |
| 23 | StartTrial | Leave blank |
| 24 | StartTrial | Leave blank |
| 25 | StartTrial | Leave blank |
| 26 | StartTrial | Leave blank |
| 27 | StartTrial | Leave blank |
| 28 | StartTrial | Leave blank |
| 29 | StartTrial | Leave blank |
| 30 | StartTrial | Leave blank |
| 31 | StartTrial | Leave blank |
| 32 | StartTrial | Leave blank |
| 33 | StartTrial | Leave blank |
| 34 | StartTrial | Leave blank |
| 35 | StartTrial | Leave blank |
| 36 | StartTrial | Leave blank |
| 37 | StartTrial | Leave blank |
| 38 | StartTrial | Leave blank |
| 39 | StartTrial | Leave blank |
| 40 | StartTrial | Leave blank |
| 41 | StartTrial | Leave blank |
| 42 | StartTrial | Leave blank |
| 43 | StartTrial | Leave blank |
| 44 | StartTrial | Leave blank |
| 45 | StartTrial | Leave blank |
| 46 | StartTrial | Leave blank |
| 47 | StartTrial | Leave blank |
| 48 | StartTrial | Leave blank |
| 49 | StartTrial | Leave blank |
| 50 | StartTrial | Leave blank |
| 51 | StartTrial | Leave blank |
| 52 | StartTrial | Leave blank |
| 53 | StartTrial | Leave blank |
| 54 | StartTrial | Leave blank |
| 55 | StartTrial | Leave blank |
| 56 | StartTrial | Leave blank |
| 57 | StartTrial | Leave blank |
| 58 | StartTrial | Leave blank |
| 59 | StartTrial | Leave blank |
| 60 | StartTrial | Leave blank |
| 61 | StartTrial | Leave blank |
| 62 | StartTrial | Leave blank |
| 63 | Subscribe | Leave blank |

CV 0 is the baseline/no matched event. Values 4–62 intentionally repeat StartTrial: the SDK sorts rules descending, so StartTrial selects 62; 4–61 are redundant, not revenue tiers. Expected highest values are install 1, ViewContent 2, Registration 3, StartTrial 62, Subscribe 63. Do not configure LaunchAPP or retention above these. If SKAN4 coarse rules are exposed, use low=InstallApp, medium=Registration, high=Subscribe (later-window Subscribe is absent in v1). Fine values apply to the first postback window, not all three.

### What 1.7.2 actually does

The inspected tag resolves to commit `2a3a35560c2c0547f74869c58160946e29c0932c`. The app does not hardcode conversion values. It leaves TikTok SKAN support enabled, and calls `trackTTEvent` with the standard names. `TikTokRequestHandler.m` reads `data.skan4_event_config` from the remote config response and passes it to `TikTokSKAdNetworkConversionConfiguration.configWithDict`. That parser loads `postbacks[].fine` / `coarse`, currency, `conversion_value` and `event_funnel[].event_name_report`. `TikTokSKAdNetworkWindow.m` sorts fine rules descending; `TikTokSKAdNetworkSupport.m` matches events and invokes Apple's update API. Thus the uploaded schema, once served by TikTok, drives the device. This is source confirmation, not proof that the dashboard has published this table or that a real Apple postback arrived.

The matcher uses accumulated revenue strictly greater than `revenue_min` and does not enforce `revenue_max`. Both bounds zero match any event, including zero-revenue trials. Event-only rules avoid currency conversion, threshold-boundary and upper-bound issues. The SDK can attempt a lower CV after a later lower-priority event; Apple enforces increasing fine values. Real postbacks still require device/ad-attribution testing.

Sources inspected on 2026-10-18:
- [TikTokRequestHandler.m](https://github.com/tiktok/tiktok-business-ios-sdk/blob/1.7.2/TikTokBusinessSDK/Core/TikTokRequestHandler.m)
- [TikTokSKAdNetwork/TikTokSKAdNetworkConversionConfiguration.m](https://github.com/tiktok/tiktok-business-ios-sdk/blob/1.7.2/TikTokBusinessSDK/Core/TikTokSKAdNetwork/TikTokSKAdNetworkConversionConfiguration.m)
- [TikTokSKAdNetwork/TikTokSKAdNetworkWindow.m](https://github.com/tiktok/tiktok-business-ios-sdk/blob/1.7.2/TikTokBusinessSDK/Core/TikTokSKAdNetwork/TikTokSKAdNetworkWindow.m)
- [TikTokSKAdNetwork/TikTokSKAdNetworkRuleEvent.m](https://github.com/tiktok/tiktok-business-ios-sdk/blob/1.7.2/TikTokBusinessSDK/Core/TikTokSKAdNetwork/TikTokSKAdNetworkRuleEvent.m)
- [TikTokSKAdNetworkSupport.m](https://github.com/tiktok/tiktok-business-ios-sdk/blob/1.7.2/TikTokBusinessSDK/Core/TikTokSKAdNetworkSupport.m)
- [TikTok integration guide](https://ads.tiktok.com/help/article/how-to-integrate-tiktok-app-events-sdk)

## Events and dashboard ownership

| App event | Owner | Meta | TikTok |
|---|---|---|---|
| Install / launch / retention | SDKs | fb_mobile_activate_app | InstallApp / LaunchAPP / 2Dretention |
| Onboarding finished | Client, once per install | fb_mobile_complete_registration | Registration |
| Paywall shown | Client, each load | fb_mobile_content_view | ViewContent |
| Free trial | Client, first conversion | StartTrial, no revenue | StartTrial, no revenue |
| First paid start | Client | Subscribe, value + fb_currency | Subscribe, value + currency |
| Trial conversion / renewal | Adapty, ATT consenting users | fb_mobile_purchase only | None in v1 |
| Refund | Adapty | Dashboard mapping | None in v1 |

Marketing confirms Meta Live, correct bundle/Store IDs, ad account connected, automatic in-app event logging OFF; Adapty trial started and subscription started OFF, trial converted and renewed purchase-only, refunds ON. TikTok remains pending SDK verification. Owner must upload the table, disable TikTok automatic in-app purchase collection, register the physical test device in Meta Test events, enable TikTok token-based test mode, and collect platform receipts and Adapty sandbox Event Feed evidence.

## Privacy and remaining limits

The app privacy manifest declares the SDK source's default tracking endpoint `analytics.us.tiktok.com` alongside Meta's declared tracking domain. TikTok's shipped manifest contains only a UserDefaults reason and empty collected-data placeholders, so it is not a complete privacy declaration. The same pinned build hook removes its invalid empty collected-data placeholder while retaining the SDK resource bundle and UserDefaults reason; the app manifest declares advertising data. TikTok enhanced data postback is explicitly disabled before initialization so remote configuration cannot enable automatic screen/interaction capture. A pinned CocoaPods post-install patch also makes TikTok's remote payment setting respect `disablePaymentTracking()` before observation starts, removing the polling race; it also permanently disables the separate remotely controlled SDK screenshot path (which is independent of enhanced data postback); unexpected source fails the build. Both conversion names claim the same account/transaction flags, preventing trial-to-paid re-purchase acquisition double counts. TikTok delays its first flush by 120 seconds to allow the onboarding ATT answer; onboarding can take longer, so this is a bounded delay rather than a promise to wait indefinitely. Custom debug logs contain only the reviewed event name, value and currency, and compile out outside DEBUG. Never enable verbose SDK request logging: it can include credentials.

App Store privacy label: Device ID, Product Interaction and Purchase History are collected, linked to the user and used for tracking and Third-Party Advertising. Retain existing declarations for other features. Advertising SDKs also automatically attach device/network metadata; the app-property allow-list does not prove the complete network payload. Owner must reconcile the final archive privacy report with both SDK manifests and the existing label. No health, location, step, gym or Screen Time information may be added to ad events.

Accepted by owner on 2026-10-18: Meta sandbox events may reach the live dataset (A14); the documented at-most-once policy and its residuals are accepted (A3/A9/B9). Local keychain dedupe cannot guarantee cross-device exactly-once; Ask to Buy is knowingly dropped. Interrupted paid access without a signed transaction is also knowingly dropped: it could be a trial that converted while the app was closed, so it must not fabricate Subscribe. Active confirmed free trials still recover. A crash after ledger claim knowingly drops the event. These limits must not be represented as complete attribution.


## Local verification evidence

- `.excer/ad-setup/check-final.log`: 23 checks, including typecheck, lint and the no-tests invariant. This repo verifies scenarios rather than adding test files.
- `.excer/ad-setup/proof-summary.json` plus `recovery-regression.json`: all 19 final focused proofs passed. Both new regressions were observed failing against the old source before the fixed proof passed.
- `.excer/ad-setup/forbidden-property-check.log`: adding `steps` to the ad-property allow-list fails the guard; `allow-list-restored.log` passes after restoring it.
- `.excer/ad-setup/debug-signed.log`, `release-signed.log`, `release-runtime-summary.json`, `debug-artifact.json`, `release-artifact.json`: keyed native builds and artifact/privacy checks. Debug-only diagnostic strings are absent from Release.
- `.excer/ad-setup/native-sdk.log`: credential-redacted SDK initialization diagnostics. `.excer/ad-setup/native-blocker.json` and `native-signed.png`: real runtime blocked by unavailable simulator Core Motion.
- No connected physical iPhone was available (`devices.log`). No Events Manager or Adapty receipt is claimed.

B7 differs from the strict brief: TikTok intentionally enables SDK debug/test mode in non-production Store environments, including a Release preview/TestFlight build, to keep its sandbox events marked as tests. It is off only for a verified production App Store environment. Meta app-event diagnostic logging compiles in DEBUG or an explicitly local EXCER_DEVICE_PROOF build; normal Release configuration enables neither. The owner accepted this preview/TestFlight test-mode policy on 2026-10-18 (B7); verified production must keep TikTok test mode off. Confirm token-based test routing with device/dashboard evidence. Lack of an ad click does not make Meta sandbox events test-only, which the owner also accepts (A14).

## Physical-device verification safety

The 2026-10-18 owner-device run uses iPhone 13 “Il”. An App Store installation with existing data was found; never delete its app or container. A development build may replace the binary while retaining data. Fresh-install/reinstall proofs that require erasure must be blocked when owner data exists. In the 2026-10-18 run, the owner later explicitly authorized ExcerLock sign-out and reinstall after verified app/shared-container backups, with restoration afterwards. That run-specific authorization does not permit erasure in future runs. Keychain state survives reinstall; filesystem erasure alone does not establish a new identity or purchase eligibility. The separate research bundle deliberately strips client configuration (`app.config.ts`), including advertising and Adapty credentials, and runs lab-local identity; it cannot prove attribution or real StoreKit purchases for these registered apps. Use only the dedicated sandbox tester, never the owner’s Apple Account or real-money purchases. Device evidence, event UTC timestamps, dashboard checklist and B1–B10 outcomes belong in `~/device-test-report.md`; live status is `~/device-test/STATUS.txt`. SDK calls alone do not prove platform receipt.

## Marketing follow-up: SDK verification

On 2026-10-18 marketing reported TikTok “Pending verification”, incomplete “Events received” and a SKAN-save permission error, with only simulator test events observed. Source and the prepared artifact confirm TikTok `appId=6787265352` (App Store ID) and `tiktokAppId=7697759561817669653`; the IDs are not swapped. After the B tests, a separate local Release proof may omit debug mode once to send naturally eligible non-test launch/registration events. `tools/ad-device-proof/prepare-live-proof.sh` temporarily patches the local native module only during that build and restores it on exit. This is not the default preview/TestFlight configuration and must not be shipped. No owner data or once-per-install flag may be reset to manufacture install/registration events. Record actual UTC events and dashboard receipt; do not assume non-test events alone cure a permission error.

The published latest stable Meta SDK is 19.0.0 (GitHub release published 2026-10-16 20:19:50 UTC). The adapter pins that CocoaPod and disables both new privacy controls and Meta SKAdNetwork reporting before SDK initialization, in addition to plist settings. `./excer check` guards both the pin and startup ordering. Native compatibility compilation and device/privacy evidence are separate requirements; see the current device report for outcomes. Meta SKAdNetwork management remains intentionally disabled because TikTok owns conversion values. Source: https://github.com/facebook/facebook-ios-sdk/releases/tag/v19.0.0.
