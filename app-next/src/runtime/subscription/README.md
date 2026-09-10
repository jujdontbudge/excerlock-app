# Adapty subscription runtime

`AdaptySubscriptionAdapter` is the custom-paywall SDK 4 boundary. Root supplies the public SDK key, the auth service's exact `waitForIdentityReady` and `runIdentityOperation` functions, the current canonical identity, PostHog distinct-ID lookup, and a native subscription-management opener. The adapter owns no navigation and emits no purchase/revenue lifecycle analytics.

Identity setup is `activate` once, one `onLatestProfileLoad` listener, then awaited `identify(uid)` from the auth spine. Identify deliberately does not await the ready gate, which would deadlock the spine. Purchase and restore set busy before awaiting the ready gate, enter the global identity serializer afterward, then await `setIntegrationIdentifier('posthog_distinct_user_id', distinctId)` immediately before the native SDK call.

SDK 4 custom paywalls use `getFlow(placement, { fetchPolicy, loadTimeoutMs })`, `getPaywallProducts(flow)`, and `logShowFlow(flow)`. Returned product order and exact opaque SDK objects are retained behind generation/variation-bound public handles; stale handles fail. No static prices or product fallback are used. UI renders localized price, localized period, eligible returned offer, renewal disclosure, Terms, and Privacy.

Profiles publish only when `customerUserId` and canonical generation match. The initial three-second budget yields `unknown` while the single late request continues. Vendor errors and empty paired restore callbacks cannot downgrade known live access; a later independent authoritative callback can expire it. Pending and cancellation clear busy without granting access.

Official integration reference: https://adapty.io/docs/posthog (`posthog_distinct_user_id`). Physical StoreKit/Adapty/provider activation and sandbox attribution remain device verification gates.
