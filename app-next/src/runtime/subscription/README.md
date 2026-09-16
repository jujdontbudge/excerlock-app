# Adapty subscription runtime

`AdaptySubscriptionAdapter` is the custom-paywall SDK 4 boundary. Root supplies the public SDK key, the auth service's exact `waitForIdentityReady` and `runIdentityOperation` functions, the current canonical identity, PostHog distinct-ID lookup, the runtime's `reportError`, and a native subscription-management opener. The adapter owns no navigation and emits no purchase/revenue lifecycle analytics.

Identity setup is `activate` once, one `onLatestProfileLoad` listener, then awaited `identify(uid)` from the auth spine. Identify deliberately does not await the ready gate, which would deadlock the spine. Purchase and restore set busy before awaiting the ready gate, enter the global identity serializer afterward, then await `setIntegrationIdentifier('posthog_distinct_user_id', distinctId)` immediately before the native SDK call.

SDK 4 custom paywalls use `getFlow(placement, { fetchPolicy, loadTimeoutMs })`, `getPaywallProducts(flow)`, and `logShowFlow(flow)`. Returned product order and exact opaque SDK objects are retained behind generation/variation-bound public handles; stale handles fail. No static prices or product fallback are used. UI renders localized price, localized period, eligible returned offer, renewal disclosure, Terms, and Privacy.

## Bundled fallback paywall (B3)

Activation chains `activate` → `setFallback({ ios: { fileName } })` → the profile listener, so the fallback is registered before the first `getFlow`. When Adapty is unreachable and nothing is cached, the SDK answers a placement from that file instead of failing, and the paywall renders from it like any other flow.

- Asset: `app-next/assets/adapty-fallback.json`, named once in `fallbackPaywall.ts`.
- Embedding: `config/native.ts` hands the same path to the `react-native-adapty` config plugin (`fallbackFile.ios`), so `expo prebuild` registers it as an iOS bundle resource. Metro never sees it: the file is **not** part of an EAS Update bundle, because the iOS SDK resolves `fileName` against `Bundle.main`. An OTA can change the paywall JS but never this file, so a fresh export needs a fresh binary.
- Export: the file is generated per platform in the Adapty dashboard (**Placements → Fallbacks**, SDK v4 — a single bundle for flows, paywalls and onboardings). No CLI or API route exists for it.
- Format: AdaptySDK-iOS 4.0.2 accepts `meta.version: 10` only; a different version makes `setFallback` throw and drops the offline path.
- Failure: a failed registration is reported through `reportError` and does **not** fail activation. Losing the offline file must never take down online purchases or the identity spine; the paywall load error stays the visible path for the user.
- Limits: StoreKit still has to resolve the referenced vendor products, so the fallback only renders purchasable plans where StoreKit has those products (or a cached copy).
- State: the committed file is a **placeholder** for the real dashboard export — it mirrors Premium A (annual/monthly) and Win-back A with placeholder `adapty_product_id`s, and only product ids that the local `storekit/ExcerLock.storekit` catalog defines. Replace it wholesale when the export is available.

Profiles publish only when `customerUserId` and canonical generation match. The initial three-second budget yields `unknown` while the single late request continues. Vendor errors and empty paired restore callbacks cannot downgrade known live access; a later independent authoritative callback can expire it. Pending and cancellation clear busy without granting access.

Official integration reference: https://adapty.io/docs/posthog (`posthog_distinct_user_id`). Physical StoreKit/Adapty/provider activation and sandbox attribution remain device verification gates.
