# ExcerLock payments research

Research completed October 26, 2026 (Chicago; October 27 UTC). Read-only reference: `/tmp/excer-ref`, commit `d330842df00b2e7df86e1a882f93df5fc14fa6cc`. Live reads used `asc` 5.4.0 and `adapty` 0.8.3. No repository or dashboard was changed; no purchase, restore, tester reset, or webhook test was executed. Recommendations below are proposed settings, not applied settings.

**Recommendation:** use Adapty’s current device profile to unlock on-device Premium, allow purchase and use without app login, and keep the server’s subscription mirror off the purchase-to-access path. Sell two subscriptions, monthly $9.99 and annual $39.99, with a three-day introductory trial on both. Remove trial toggles, no-trial twins, install splits, and webhook polling from the rebuilt flow.

## 1. Minimal correct Adapty integration

### Activation, profiles, identity, and logout

Activate the singleton once per app process with the public SDK key, await completion, and use normal purchase management rather than observer mode. If a genuine signed-in account is already available, pass its stable account ID as `customerUserId`. Otherwise omit it: Adapty creates/persists an anonymous profile; an app-auth account is unnecessary for StoreKit purchases. Never invent a new customer ID each launch. Reinstalls create new anonymous profiles, while store purchase synchronization can recover access. [React Native quickstart](https://adapty.io/docs/react-native-quickstart-identify), [SDK reference](https://react-native.adapty.io/classes/adapty).

These identity operations have different consequences:

| Operation | Profile and purchase/access behavior |
|---|---|
| Purchased **Adapty-anonymous** profile → `await identify(newCustomerId)` | The unused ID attaches to the current profile. Its purchase history and access remain on that profile. Do not call `logout` first. |
| Purchased anonymous profile → `await identify(existingCustomerId)` | SDK switches to the profile already associated with that ID. This is not a guaranteed merge of all anonymous history/attributes. Re-read the resulting profile; access inheritance follows the sharing policy below. |
| `await logout()` | Creates a new anonymous profile. It does not cancel/refund the Apple subscription or delete the old profile. Store-linked access can remain available under the sharing rules; logout is not a reliable way to revoke device Premium. |

These are documented identity semantics, not a promise that every backend event will be reassigned to the new customer ID. Re-fetch products/paywalls after identity changes and resubmit needed attributes. Serialize identify/logout against purchase/restore and discard stale profile responses. [Identity quickstart](https://adapty.io/docs/react-native-quickstart-identify), [identifying users](https://adapty.io/docs/react-native-identifying-users).

**Critical distinction for October 24:** a Supabase anonymous account whose UUID was passed to `identify` is already an **identified Adapty profile**. It is not the anonymous-to-new-ID attachment case above. Changing to another Supabase UUID crosses customer identities and needs the sharing policy; it cannot be treated as renaming an anonymous Adapty profile.

In Adapty **App settings → General → Sharing paid access between user accounts**, the documented choices are:

| Setting | Result when another customer ID claims the same store purchase |
|---|---|
| **Enabled (default)** | Both profiles retain access. Transaction history stays on the purchase’s parent profile; inheritors receive access updates. |
| **Transfer access to new user** | One identified customer ID has access at a time; the new ID receives access and the previous one loses it when the transaction propagates. Anonymous sessions can still inherit access. |
| **Disable paid access sharing** | Access stays tied to the purchasing customer ID; another ID cannot inherit it. Unsuitable for unrestricted guest checkout. |

Sandbox has a separate setting. Anonymous profiles using the same store account always share access. Changing the policy does not immediately rewrite existing profiles; a subsequent store event/restore can be needed. Under Transfer, restore while anonymous can temporarily leave the old identified profile entitled until identify occurs; use `activate → identify → restore` when deliberately transferring to an account. [Sharing policy](https://adapty.io/docs/sharing-paid-access-between-user-accounts).

**For this rebuild choose Enabled in production and sandbox.** ExcerLock’s paid work happens on-device and does not need exclusive app-account ownership. This intentionally allows multiple app accounts using the same purchasing Apple account to retain Premium. Transfer is the alternative only if exclusive account ownership becomes a real requirement; do not disable sharing for guest purchases. The live sharing setting was not exposed by the CLI reads and is **unverified**.

### Profile, purchase, restore, and offline behavior

Keep one profile store and one `onLatestProfileLoad` listener. Apply profiles returned by purchase and restore directly, call `getProfile()` after startup/identify and on foreground when appropriate, and let the listener update the same store. Premium is `profile.accessLevels?.premium?.isActive === true`; trial, cancellation, billing status and renewal are display metadata, not independent gates. `willRenew=false` does not mean expired. [Subscription status](https://adapty.io/docs/react-native-check-subscription-status).

Conceptual SDK 4 sequence (error presentation omitted):

```ts
await adapty.activate(PUBLIC_SDK_KEY, knownAccountId
  ? { customerUserId: knownAccountId } : {});
const listener = adapty.addEventListener('onLatestProfileLoad', applyProfile);
await adapty.setFallback({
  ios: { fileName: 'adapty-fallback.json' },
  android: { relativeAssetPath: 'adapty-fallback.json' },
});
applyProfile(await adapty.getProfile());
const flow = await adapty.getFlow('onboarding', {
  fetchPolicy: 'reload_revalidating_cache_data', loadTimeoutMs: 5000,
});
const products = await adapty.getPaywallProducts(flow);
// Render these exact products; when shown, call logShowFlow(flow).
const result = await adapty.makePurchase(selectedProduct);
if (result.type === 'success') applyProfile(result.profile);
// 'pending': await later profile update; 'user_cancelled': remain on paywall.
// Explicit Restore button: applyProfile(await adapty.restorePurchases()).
// Remove listener on manager disposal, not on every screen transition.
```

Use three access states: **unknown/loading**, **active**, **confirmed inactive**. A timeout/network/429/identity transition must not become “unpaid.” After purchase success with unresolved access, show recovery with refresh/Restore/support; do not automatically start another purchase or replay onboarding. Never automatically retry `makePurchase`. [Purchase results](https://adapty.io/docs/react-native-making-purchases).

Provide visible **Restore purchases** on the paywall and in Settings. Restore synchronizes store purchases and returns a profile; inspect its access level. It does not grant a second trial or cancel anything. Automatic StoreKit synchronization at activation handles ordinary launches; an explicit restore remains the recovery path and may require store authentication. SDK 4.0.2 can report code 1004 for an empty Android restore; current docs say 4.0.3+ returns the current profile instead. An empty iOS restore is normally determined from the returned profile. [Restore](https://adapty.io/docs/react-native-restore-purchase), [cross-device synchronization](https://adapty.io/docs/react-native-identifying-users).

`getProfile()` tries the network and falls back to cached profile data; the listener also supplies cached data offline. This supports existing subscribers offline, but cannot discover a renewal/refund the device has never received. Keep the last known entitlement through transient errors; respect its known access/grace expiry and refresh when connectivity returns. After that expiry, show an unverified/recovery state rather than claiming the store proves nonpayment. Do not invent a new perpetual local Premium flag. **Docs do not specify a universal cache freshness/offline-guarantee interval.** [Profile cache reference](https://react-native.adapty.io/classes/adapty#getprofile).

### Placements, paywalls, products, and fallback

A **placement** is the stable app entry point (`onboarding`, `in_app`); Adapty resolves its audience/variation to a paywall/flow containing products and remote copy. In SDK 4 use `getFlow`, `getPaywallProducts(flow)`, and `logShowFlow`; old `getPaywall` examples are SDK 3. Retain the returned SDK product object, price, period, eligible offer, and variation through checkout. Do not synthesize a product object from a SKU or choose a different SKU behind displayed terms. [RN fetching](https://adapty.io/docs/fetch-paywalls-and-products-react-native).

Default fetch policy is network-first with cached fallback; `return_cache_data_else_load` is cache-first. Use a 3–5 second flow timeout. Bundle an Adapty-generated **SDK 4** fallback file covering every used placement, add it via the Expo plugin/native bundle, and call `setFallback` before fetching. SDK 3 fallback JSON is incompatible. Fallbacks choose one variation and do not reproduce live targeting/A/B assignment; changing them requires shipping the bundle again. SDK 4 supports the newer localized bundle, unlike the old English-only fallback format. [Fetching guidance](https://adapty.io/docs/react-native-optimize-paywall-fetching), [SDK 4 fallback](https://adapty.io/docs/fallback-flows), [Expo registration](https://adapty.io/docs/react-native-use-fallback-paywalls-expo).

Fallback **configuration is not an offline App Store catalog or payment processor**: the pinned 4.0.2 SDK explicitly says products are not cached by Adapty for an offline purchase flow. If StoreKit products cannot load, show retry/Restore/support, never invented prices or a false trial promise. Source checked from the published [4.0.2 package](https://registry.npmjs.org/react-native-adapty/-/react-native-adapty-4.0.2.tgz), `src/adapty-handler.ts:1025`.

**Trial documentation ambiguity:** the RN purchase page warns custom UIs must check eligibility, whereas the fetching docs describe offer-bearing returned products. The pinned types expose `product.subscription.offer` and no iOS offer-selection parameter on `makePurchase`; use the exact eligibility-resolved product. Display a trial only when its returned offer phases establish it. Verify eligible/ineligible accounts and the Apple confirmation terms on the shipping native version; a `.t3` suffix or remote `trial:true` does not establish eligibility. [Purchase warning](https://adapty.io/docs/react-native-making-purchases), [RN product fields](https://adapty.io/docs/fetch-paywalls-and-products-react-native), [pinned core types](https://registry.npmjs.org/@adapty/core/-/core-4.0.1.tgz).

### Webhooks that matter

Enable **`access_level_updated`** explicitly: it covers entitlement changes on inheritor profiles, restores/transfers and Family Sharing, where a new `subscription_started` event may never occur. Transactional events remain on the parent; retain `profile_id`, nullable `customer_user_id`, store/original transaction identifiers, environment and sharing information rather than indexing everything solely by current app user ID. [Profile chains](https://adapty.io/docs/how-profiles-work).

Also retain `trial_started`, `trial_converted`, `trial_expired`, `subscription_started`, `subscription_renewed`, `subscription_expired`, `trial_renewal_cancelled/reactivated`, `subscription_renewal_cancelled/reactivated`, `billing_issue_detected`, `entered_grace_period`, and `subscription_refunded`. Cancellation stops renewal but normally preserves current access; a trial conversion is the first charge, while `subscription_renewed` starts at the second billing. Optional `trial_active`/`subscription_active` checkpoints are unnecessary for minimal entitlement logic. [Event definitions](https://adapty.io/docs/webhook-event-types-and-fields).

Authenticate the configured authorization header, durably store valid events, deduplicate by `profile_event_id`, acknowledge promptly, and process asynchronously. Preserve unmatched/anonymous events. Delivery is duplicated, delayed and unordered; reconcile ambiguous/stale projections with a server-side profile GET rather than blindly replaying lifecycle flags. Docs describe typical delivery in 5–60 seconds, cancellation delays up to two hours, bounded retries and delivery pauses after failures—so a successful purchase cannot wait for this path. A paused integration can explain **no API requests**, but is not proven here. [Delivery contract](https://adapty.io/docs/set-up-webhook-integration).

**Ordering ambiguity:** Adapty warns `event_datetime` is business time and not safe for ordering, then recommends receipt order despite unordered delivery. Receipt order alone cannot establish current state either. Store the audit stream and use a fresh authoritative profile for reconciliation. [Webhook fields](https://adapty.io/docs/webhook-event-types-and-fields).

## 2. Apple / StoreKit facts

| Topic | Concrete behavior and implication |
|---|---|
| Introductory offers | One introductory offer per Apple subscription group, across its products. New app/Supabase/Adapty identities do not reset it. Eligibility is not simply “has never purchased this SKU”; check the store-resolved eligibility. Ineligible users can buy the same product at its regular price, so separate no-trial twins are unnecessary. [Apple introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions). |
| Groups and plan changes | One active subscription per group; separate groups can charge simultaneously. Higher-ranked upgrade starts immediately with adjustment/refund of unused service; downgrade starts next renewal. Same-level crossgrade starts immediately for equal durations, next renewal for different durations. Monthly/annual equivalent Premium should share one level. The repo’s blanket statement that all crossgrades are prorated is inaccurate. [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/), [subscription information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information/). |
| Billing retry / grace | Apple may retry failed renewal billing for up to 60 days. Retry alone does not promise continued access. Configurable grace preserves service while Apple retries: monthly/annual choices are 3, 16 or 28 days; weekly plans are capped differently. Keep Premium while Adapty reports active grace, then honor the updated inactive state. [Billing](https://developer.apple.com/documentation/storekit/handling-subscriptions-billing), [grace settings](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions/). |
| Refunds | Users request refunds through Apple (for example Report a Problem); Apple decides. Requesting a refund is not an immediate revocation. Approved refunds/revocations and possible reversals must update entitlement; do not infer all future access from one refunded historical transaction when another entitlement exists. Refresh the current profile. Cancelling auto-renewal is not a refund. [Apple refund notifications](https://developer.apple.com/documentation/storekit/handling-refund-notifications), [notification types](https://developer.apple.com/documentation/appstoreservernotifications/notificationtype). |
| Family Sharing | If enabled per subscription, the purchaser can share with up to five family members using separate Apple accounts. It is independent of Adapty’s same-store-account sharing policy. Developer enablement cannot be undone; users can stop sharing, leave the family, or lose access after a refund. Inheritor entitlement updates matter. [Apple Family Sharing](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases), [implementation](https://developer.apple.com/documentation/storekit/supporting-family-sharing-in-your-app). |

### Sandbox and TestFlight

- **Sandbox testers:** accelerated renewal speed is configurable (3/5/30/60-minute monthly equivalents). Default: monthly 5 minutes, annual 1 hour; up to 12 renewals, then auto-renewal stops on the thirteenth attempt. These expirations are not production billing failures. [Sandbox settings](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/manage-sandbox-apple-account-settings).
- **TestFlight default differs:** every subscription duration renews daily, up to six times in a week. To use faster rates and billing-failure controls, use a Sandbox Apple Account. [TestFlight testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/).
- **Device settings:** enable Developer Mode. For development-signed apps, attempt a purchase and sign into **Settings → Developer → Sandbox Apple Account**; signing out of the production account is unnecessary. For TestFlight sandbox controls, first download with the production account, then sign out of **Media & Purchases**, and sign into the sandbox account under Developer. Open **Manage → Account Settings** for controls. [Apple sandbox setup](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox).
- **Interrupted purchases:** tester setting **Interrupt Purchases for This Tester** simulates outside-app work such as accepting terms/payment correction. Preserve pending/recovery state and accept later completion; do not report a definitive failure or repurchase automatically. **Clear Purchase History** resets that sandbox account’s purchases/intro testing; reinstalling the app or changing Adapty profile does not. Clearing is irreversible and was not performed. [Tester controls](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/manage-sandbox-apple-account-settings).
- **Ask to Buy:** approval can be deferred; unlock only after approval produces active access. Xcode StoreKit testing supports approval/decline scenarios, and native StoreKit 2 provides `simulatesAskToBuyInSandbox(true)`. The pinned RN 4.0.2 purchase parameters expose no equivalent iOS option; use a native test harness/Xcode test configuration if needed, rather than pretending interrupted purchases are the same case. [Ask to Buy testing](https://developer.apple.com/documentation/storekit/testing-ask-to-buy-in-xcode), [sandbox purchase option](https://developer.apple.com/documentation/storekit/product/purchaseoption/simulatesasktobuyinsandbox(_:)).

For later implementation verification, cover eligible/ineligible trials, deferred approval, interruption and relaunch, cancelled renewal with still-active access, grace/recovery/expiry, refund, restore after reinstall, and anonymous purchase → new/existing app account. Those are proposed tests, not executed research actions.

### App Review requirements

- **3.1.1:** use IAP for digital Premium; provide restoration for restorable purchases.
- **3.1.2:** provide ongoing subscription value, at least a seven-day subscription period, access across the user’s devices, clear purchased benefits/terms, and seamless plan changes without accidental duplicate subscriptions. A three-day introductory trial on monthly/yearly products is compatible with the subscription-period rule. Show actual billing period/total, trial conversion terms, renewal/cancellation information, Terms and Privacy.
- **5.1.1(v):** without significant account-based features, let people use the app without login. If accounts can be created, provide in-app account deletion. A local Screen Time utility has a strong reason to support guest purchase/use; forcing sign-in after payment adds avoidable failure.

These are product implications, not an App Review approval prediction. Also relevant to this specific app: **4.10 explicitly names Screen Time APIs among built-in capabilities that cannot themselves be monetized**; the Premium proposition must be ExcerLock’s substantive service/Condition functionality, with the boundary ultimately determined by App Review. [Current Apple guidelines](https://developer.apple.com/app-store/review/guidelines/).

## 3. `annual.3999.t0` / user `e0624c79`: evidence and confidence

**The historical root cause cannot be established from the supplied label.** Current configuration does not support “product missing/unapproved,” and the current code’s `not_found` is a restore outcome rather than a purchase-product lookup error.

Live reads at approximately **2026-10-27 01:20–01:35 UTC**:

| Check | Observed result |
|---|---|
| `asc subscriptions view --id 6810463566` | Exact SKU `com.johansardar.excerlock.premium.annual.3999.t0`; **APPROVED**; `ONE_YEAR`; `groupLevel:37`. |
| ASC availability view + available-territories list | **175 territories**, USA included; `availableInNewTerritories:true`. |
| ASC effective USA prices | **USD 39.99**. |
| ASC introductory-offer list | **0 offers**, consistent with no trial. Missing trial eligibility is therefore not a reason this SKU should be absent. |
| `asc subscriptions list --group-id 22372981 --paginate` | Product belongs to **ExcerLock Premium**, group `22372981`, containing 45 products. Confirms [repo catalog](/tmp/excer-ref/docs/subscriptions.md:3). Launch plans belong to separate group `22279282`. |
| Adapty `placements get … 29524927-9f2f-4dc0-a56a-ce59c6876c4b` | `onboarding`, active; one all-users audience, priority 0, paywall **`c79aa881-9e63-4abd-acc4-369f0ad6048c`**. |
| Adapty `paywalls get` + `products list --page-size 100` | Paywall includes Adapty product **`bc8705f8-7e7d-407f-9eef-e673a597f95a`**, mapped to the exact annual `.t0` SKU and `premium` access-level UUID `b95ba4b6-812e-4ce4-b2ac-8416006bc40a`. |

Paywall product order from the live UUID mapping:

1. `annual.3999.t3` — `0aba392a-2439-48b4-973c-116efd9c4f47`
2. `monthly.999.t3` — `970b6dcc-4768-45d8-8bae-916de5ea92c0`
3. `annual.3999.t0` — `bc8705f8-7e7d-407f-9eef-e673a597f95a`
4. `monthly.999.t0` — `9abeeab6-dacd-4c00-b063-0c7ded21e893`

Code findings from `rg -n -C 4 'not_found' /tmp/excer-ref/app-next/src`:

- [AdaptySubscriptionAdapter.ts:440](/tmp/excer-ref/app-next/src/packages/subscription/AdaptySubscriptionAdapter.ts:440): **restore** reports `not_found` when the returned profile matches the current identity but mapped access is neither active nor trial. This means no currently active Premium was found on that profile; it does not identify a missing catalog product.
- [Same adapter:454](/tmp/excer-ref/app-next/src/packages/subscription/AdaptySubscriptionAdapter.ts:454): restore code **1004** maps to `not_found`. Its vendor name is `noPurchasesToRestore`, not `productNotFound`; current Adapty docs describe the older behavior as Android-specific. It should not be assumed to explain an iOS event. [Vendor error table](https://adapty.io/docs/react-native-handle-errors).
- [Purchase path:294](/tmp/excer-ref/app-next/src/packages/subscription/AdaptySubscriptionAdapter.ts:294): missing/stale selected SDK product throws **“Plan expired. Reload plans.”** It does not emit `not_found`. Other purchase errors retain the default failed outcome and numeric vendor code. [Diagnostics:25](/tmp/excer-ref/app-next/src/packages/subscription/CheckoutDiagnostics.ts:25).
- [Restore wrapper:6](/tmp/excer-ref/app-next/src/packages/subscription/restorePurchases.ts:6) additionally maps every non-active/non-trial returned status to UI `notFound`; this can overstate certainty for an unknown status. The dev fake also emits `not_found` for empty restore. The only other match is unrelated auth `user_not_found`.

**Confidence:** high for current ASC approval, membership, price, availability and Adapty inclusion; high for the reviewed code’s label semantics. **Low for the historical user-specific cause.** No incident timestamp, original event with `operation`, raw numeric error, app build/OTA, storefront, returned profile, or StoreKit response for `e0624c79` was available in the reviewed evidence. Today’s dashboard reads are not a historical snapshot, and dashboard membership cannot prove what that device’s StoreKit returned. The analytics gap further limits inference.

Most defensible interpretation **if this event came from the reviewed code**: an empty/inactive-profile restore was described as a purchase failure. If the incident was genuinely a purchase lookup failure, investigate its original numeric code (for example iOS 1000 `noProductIDsFound`, 1002 product request failure, or StoreKit 5 unavailable product), bundle/store environment, stale product object and historical paywall variation. None is established by `not_found`; do not “fix” this by creating another SKU or changing groups.

Additional confirmed catalog problem: live annual `.t3` is **level 38**, monthly `.t3` **level 14**, annual `.t0` **level 37**, despite equivalent Premium. This creates upgrade/downgrade semantics rather than equivalent-tier crossgrades. It merits correction in the proposed catalog, but is **not evidence for the `not_found` incident**.

## 4. Recommended minimal design and exact target settings

### Device and server responsibilities

**Device:** one SDK manager; one cached profile; one access-level predicate. Complete onboarding and persist its checkpoint independently of subscription/auth state. At the paywall, active access enters the app immediately. Purchase → returned active Adapty profile → app, with no Supabase account creation, forced sign-in or server acknowledgment in between. Offer optional account sign-in later for actual account features; identify then refresh. Preserve local onboarding progress and Conditions through that transition.

**Server:** authenticated app-account data, durable webhook audit/support/revenue projections, and reconciliation. It may independently authorize future paid server endpoints using Adapty’s server-side profile API; never trust a client boolean for protected server resources. For current on-device Conditions/Screen Time, it need not issue a paid-access lease. Remove the requirement that a webhook row under the current Supabase ID must exist before local Premium works. Unknown server state/429 cannot invalidate an SDK-confirmed purchase. Reconcile asynchronously with bounded backoff rather than polling into the 5/min limit.

**Analytics:** checkout diagnostics must be best-effort and never awaited for entitlement. Keep a nonfinancial client attempt/result/stage/code record and use Adapty/store events for actual subscription and revenue reporting. The repo’s [October 21 audit](/tmp/excer-ref/docs/audits/payment-failure-2026-10-21/README.md:5) documents the client prefix filter; missing checkout events or missing ExcerLock API requests do not prove no StoreKit transaction happened.

### Target configuration (requires later authorized implementation)

| Surface | Exact target |
|---|---|
| New-sales catalog | **2 products:** existing `com.johansardar.excerlock.premium.monthly.999.t3` (ASC `6810462561`) and `com.johansardar.excerlock.premium.annual.3999.t3` (ASC `6810463454`). No new SKU required. |
| Apple group/levels | Both in existing **ExcerLock Premium `22372981`**, both at the **same level (target level 1)** because benefits are equal. Review ordering of remaining legacy products when configuring levels; do not leave duplicate Premium benefits ranked as different service tiers. |
| Prices | US **$9.99 / one month** and **$39.99 / one year**, localized store prices elsewhere. Availability in all supported storefronts and new territories. |
| Trial | **On for both:** `FREE_TRIAL`, `THREE_DAYS`, `numberOfPeriods=1`, applicable territories, no overlapping effective introductory offers. Let Apple determine eligibility; same product sells at regular price when ineligible. No trial-on/off toggle or `.t0` selection logic. |
| Grace | **16 days; All Renewals; Production and Sandbox** after sandbox verification. This includes first billing after a trial. Apple configures this per app, not per SKU. [Setting definitions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions/). |
| Family Sharing | **Do not newly enable** in the minimal rebuild. If already enabled, preserve/support it because it cannot be disabled. Live enablement was not established by these reads. |
| Adapty access level | Exact identifier **`premium`** (`b95ba4b6-812e-4ce4-b2ac-8416006bc40a`) on both new-sales products; retain mappings for every previously sold product. |
| Adapty sharing | **Enabled (default)** in production **and** sandbox, for the guest-first device entitlement design. |
| Paywall/placements | One new two-product paywall, annual first, monthly second; **All users / 100% / no experiment** for `onboarding` and `in_app`. Existing trial/no-trial/fallback/winback placement names still used by old clients must remain valid and safe; stop exposing divergent trial arms only with the compatible client rollout. |
| SDK fallback | Regenerate/download the iOS **SDK 4** fallback for the two-product configuration and all used placements; bundle/register it. Keep trial wording conditional on returned eligible StoreKit offer. |
| Apple integration | Configure Adapty’s IAP key/store integration. In ASC App Information use the app-specific Adapty notification URL for **Production + Sandbox**, **Version 2**. Treat that URL as confidential; it is deliberately not reproduced here. [Adapty setup](https://adapty.io/docs/enable-app-store-server-notifications). |
| Adapty → API webhook | Enable `access_level_updated` and lifecycle events listed above, authenticated endpoint, Sandbox/Production distinguished; retain anonymous/unmatched events. Mirror for support, not synchronous device admission. |

**Existing subscribers are the migration exception:** never offer a new grid purchase to an active Variant A subscriber in group `22279282`; continue honoring their `premium` access and open Apple Manage Subscriptions. Different groups can coexist and charge twice. Preserve all legacy entitlement mappings and existing subscriptions/trial expiries; simplify what new users see without deleting old products or forcing a repurchase. The current four-product paywall supports old JavaScript pairing logic, so replacing it without a compatible rollout can break those clients. [Catalog and compatibility notes](/tmp/excer-ref/docs/subscriptions.md:21).

Unverified live settings: paid-access sharing, grace enablement, Family Sharing, ASC notification destination/version, and webhook event selection/delivery health. The table specifies the recommended destination; it does not assert these are already configured. Public docs do not guarantee identity-switch propagation latency or immediate webhook reassignment, and no live purchase test was performed.
