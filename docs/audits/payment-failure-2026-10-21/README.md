# Payment-failure data audit — 2026-10-21

Six commercial-release-eligible anonymous IDs reached a paywall, including the owner-confirmed real incident user. At least five tried checkout, with eight recorded starts plus one purchase error whose start was suppressed. The observed outcomes were seven cancellations across three IDs, one successful trial that was later cancelled before billing, and one network failure. No paid conversion or refund was observed for the release-eligible cohort.

The missing purchase telemetry is explained by an explicit client-side prefix filter introduced on October 13. It discards client-owned checkout and restore events, including `purchase_started`, and also discards `subscription_verification_failed`. It follows the JavaScript bundle/OTA, not just the native build number.

This report supports payment-recovery prioritization. It is a census of the **observable candidate identifiers**, not a verified census of every external person or installation. Thirteen ambiguous identities are retained separately as possibly internal / App Review. Revenue losses cannot be causally measured from these records. The opportunity scenarios below must not be presented as measured losses or added to the owner's approximately $4,000 estimate.

## Scope and evidence

The fixed event window is **2026-09-06 20:21:05 inclusive through 2026-10-21 20:21:05 exclusive, UTC**. Source code was reviewed at `269885cc51b7a88da106ed7a1e44a6be51eefaae`. Adapty snapshots were fetched at approximately 20:26 UTC, after the event cutoff; they are current snapshots, not historical profile exports.

PostHog project **537075** contained 35 distinct IDs with `environment='prod'` and `$is_emulator=false`. The governed metric catalog was empty; these are one-off incident measures. [Q01](evidence/Q01-traffic.sql), [Q02](evidence/Q02-cohort.sql) and [cohort.csv](evidence/cohort.csv) define coverage and exclusions:

| Status | IDs | Treatment |
|---|---:|---|
| Commercial-release-eligible candidates | 17 | Version 1.0.0/1.0.1, builds 17–21, runtimes 4–6; one owner-confirmed real user |
| Possibly internal / App Review | 13 | Earlier builds or 1.0.2/builds 22–23/runtime 7; all retained in the separate section and full timelines |
| Preview-exposed identities | 2 | Excluded: `06035ee9-1f8e-4eb7-a209-5445093e5e97`, `a523f0ce-da08-44d3-99e4-e63c1996d7eb` |
| Sandbox-only subscription identities | 3 | Separated from customer/revenue analysis: `489d2f20-55a9-4bc7-809a-36d1b2d0c7b0`, `830f40b4-4b2b-405b-be7e-7f72e444cc7e`, `0ffef17e-0370-4aa2-b747-434e6e050141` |

Simulator and preview-only traffic is excluded. A separate Sandbox-only vendor ID, `53b01d14-373b-43b0-bc46-0f53c6aa0ec6`, has no qualifying physical-production client activity and is also outside the candidate cohort. The two preview-exposed IDs share a device identifier in the local join; device identifiers are intentionally not retained in this report.

The owner supplied the commercial release range and confirmed `45564b12-35c6-490a-9ddc-5ca4b19a5717` as real. [Q13](evidence/Q13-release-eligibility.sql) verifies version/build/runtime eligibility. Install distribution channel is not separately instrumented, so the other 16 qualifying IDs are release-eligible candidates, not independently verified App Store installs. No maintained internal-ID list exists. Private read-only identity checks returned all 35 accounts successfully and found no additional matches to the supplied owner account; the current directory lookup also found none. This does not rule out earlier, deleted, relay-address or alternate owner accounts. No contact or location data is retained. The known preview/device cluster remains excluded independently of email.

Sandbox is evidence of a test transaction environment, not proof that an identity is an employee. The five excluded/separated identities and all 13 ambiguous identities remain visible in the sanitized evidence so these choices can be changed without hiding their activity.

The PostHog journey query returned only 500 rows despite `LIMIT 10000`. Three pages yielded **500 + 500 + 204 = 1,204**, matching [Q03-count](evidence/Q03-count.sql). [Q08](evidence/Q08-all-vendor-events.sql) found one additional `trial_expired` event omitted by the initial event whitelist. The combined sanitized extract contains **1,205 rows**, including **510 release-eligible rows and 209 ambiguous rows**. No onboarding answers or activity details are retained; Condition-branch screen codes are replaced with `condition_flow`.

## 1. Funnel and failure classes

### Observed funnel

Counts are distinct commercial-release-eligible candidate IDs and events within the window. They are not installation conversion rates. [Q09](evidence/Q09-funnel-check.sql) independently reconciles the client counts against [Q03](evidence/Q03-journeys.sql) and [Q05](evidence/Q05-payment-signals.sql). [Derived metrics](evidence/derived-metrics.json) are recomputed by [derive.py](evidence/derive.py).

| Observation | IDs | Events |
|---|---:|---:|
| Commercial-release-eligible candidates | 17 | — |
| Paywall screen reached (`$screen`) | **6** | 9 |
| Products loaded (`paywall_viewed`) | **6** | 9 |
| Explicit checkout start | **4** | 8 |
| Additional checkout evidenced by `paywall_error operation=purchase` | **1** | 1 |
| Checkout users / attempts, lower bounds | **5** | **9** |
| Purchase returned `cancelled` | **3** | 7 |
| Technical purchase error, Adapty `#2005 networkFailed` | **1** | 1 |
| Restore attempted / `unavailable` | **2** | 4 / 4 |
| Same-session return from paywall to Welcome | **2** | — |
| Same-session return to earlier onboarding, including tail back-navigation | **3** | — |
| Apple provider sign-in failure | **4** | 8 |
| Explicit `APPLE_SIGNIN_FAILED_ERR_REQUEST_UNKNOWN` | **2** | 3 |
| Production trial started | **1** | 1 |
| Trial cancelled before billing, then expired | **1** | 1 cancellation + 1 expiration |
| Observed Production paid conversion, paid renewal, paid cancellation or refund | **0** | 0 |

The two same-session Welcome-reset IDs are `2b0c2b33…` and `45564b12…`. Including earlier tail navigation adds `7e4fe984…`; this is not a third full reset. `a69f42dc…` and `d8665640…` return to Welcome only in later sessions, so those returns cannot be attributed to the paywall's X from telemetry alone. The trial user's later Welcome returns are also retained in the full timeline.

All nine loaded views used UI `placement=onboarding`. Six views across four IDs predate arm instrumentation; all reported a catalog containing a trial, which does not establish which plan was selected or assign them retrospectively to arm A. Three views across two IDs recorded assigned/rendered **B**, `has_trial=false`. An additional build-12 ambiguous ID has two paywall screens without a loaded event; its placement/arm is unknown and it is outside this commercial cohort. No candidate in-app or win-back loaded view was observed. Historical arm comparisons would mix different bundles and incomplete exposure telemetry.

### Revenue ranking: conditional opportunities, not measured losses

Expected loss would require the incremental probability that each person would have paid without the failure, the selected localized plan, and subsequent retention. Those are unavailable. The price proxy below assumes **one current US $39.99 annual purchase per affected ID**, with no conversion-probability adjustment, taxes, fees, renewals or lifetime value. Earlier products may have different prices. These are gross one-purchase scenarios, not statistical bounds or a revenue forecast.

| Scenario rank | Class and evidence | Observed impact | Conditional price proxy | What is established |
|---|---|---|---:|---|
| 1 | Apple sign-in provider failure; Q05/Q09 and Sentry | 4 IDs, 8 events; 3 explicit `ERR_REQUEST_UNKNOWN`, 5 missing codes | **$159.96** | Sign-in friction is observed. None reached a recorded paywall or established payment intent. All four observed OS versions were 27.0.1. Two additional later-build IDs are kept in the ambiguous section. |
| 2 | Checkout cancellations; Q05 | 3 IDs, 7 attempts | **$119.97** | SDK/caller reported cancellation. Deliberate cancellation versus an underlying checkout problem is not distinguishable. This is not seven lost customers. |
| 3, tied by annual proxy | Trial cancelled before billing; Q08 + Adapty | 1 ID; trial started, cancelled and expired; $0 recorded revenue | **$39.99** | The $39.99 first annual charge did not occur. The reason for the decision is unknown; post-purchase sign-in trouble is not proof of causation. |
| Ambiguous only | Paywall screen without observed products loaded; Q03 | 1 build-12 ID, 2 screen views; no checkout start | Excluded from commercial estimate | A loaded paywall is unobserved. A load/identity blocker is possible, but not proven for this ID. |
| 3–4, depending on selected plan | Technical network checkout failure; Q05 + [Sentry EXCERLOCK-MOBILE-1A](https://edge-ix.sentry.io/issues/EXCERLOCK-MOBILE-1A) | 1 ID, 1 observed failed checkout, Adapty `#2005` | **$9.99–$39.99** first-charge opportunity | This is the clearest failed payment-intent case. Selected plan was suppressed with the start event. The precise failing network sub-operation is not established by the unsymbolicated event. |
| Unrankable | Saved-sign-in read errors; Sentry | 9 events, 5 timestamp clusters; affected external IDs unknown | Unknown | Titles do not distinguish `STORAGE_LOCKED` from `STORAGE_READ_FAILED`; user correlation is absent. |
| Unrankable | Subscription verification `request_timeout`; Sentry | 1 production-tagged event; external/internal identity unknown | Unknown | No reliable customer join or observed lost payment. |
| Overlapping friction | Welcome resets; Q03 | 2 same-session IDs | No additional amount | Already overlaps the network-failure and trial rows. |
| Overlapping friction | Restore `unavailable`; Q05 | 2 IDs, 4 attempts, before any known purchase on those IDs | No additional amount | Code means no active/trial entitlement was returned; it does not establish a service outage or missing paid purchase. |

Do not sum the rows: resets, restores and the trial user's sign-in failures overlap. No card-decline code was observed; the suppression and coarse classification mean this does not establish that no declines occurred.

Adapty's [35 sanitized snapshots](evidence/adapty-profiles.json) all returned HTTP 200. The only candidate with a subscription was `2b0c2b33…`: Production annual trial, voluntary cancellation, expiration, zero recorded revenue. The sole Production `$59.99` conversion in the complete vendor feed belongs to excluded `06035ee9…`; the other excluded preview identity also holds that Production subscription in its current profile. Neither is counted as customer revenue. **Do not sum `total_revenue_usd`: Sandbox profiles contain positive values.** The snapshots do not substitute for a complete historical billing ledger.

### Additional Sentry findings and attribution limits

The bounded [financial/authentication extract](evidence/sentry-financial-auth-errors.csv) has 32 production-tagged error records, not 32 confirmed customer failures: 16 Apple errors, 9 saved-sign-in read errors, 5 canonical-subscription-identity errors, one network failure and one verification timeout. PostHog independently locates eight Apple failures in the release-eligible cohort and eight in the ambiguous cohort; Sentry lacks a deterministic user join. Queries and exclusions are in the [evidence guide](evidence/README.md).

Five `Canonical subscription identity unavailable` errors occurred on September 28 between 19:03:42 and 19:06:00 on build 12/runtime 4, update `8b094ee1-e64e-4461-a010-e3876ba48ac7`. The paywall-only `cb445c47…` has the same release/update near that time. This is temporal correlation, not a reliable user join.

The verification `request_timeout` occurred October 21 at 16:36:53 on build 21/runtime 6. It cannot be assigned to the 15:33 incident user: the shared bundle is insufficient, and excluded internal activity is also present on that bundle. Nine saved-sign-in errors span September 22, October 5, October 9, October 14 and October 21; several occur in duplicate timestamp pairs. They are nine reports, not nine affected people.

The broader checkout search found expired-paywall/overlapping-operation errors in preview and a generic purchase error in dev; these are excluded from commercial impact. Frequent enforcement-supersession errors do not establish payment loss and were not assigned to checkout users. Sentry's “Users: 0” is compatible with stripped identity; it is not evidence that nobody was affected.

## 2. Every release-eligible paywall timeline

All times below are UTC. “First seen” is first observed production activity in this window, not installation. The [full timelines](timelines.md) enumerate every observed generic onboarding step, repeat, sign-in failure and financial event for **all 17 release-eligible candidates and all 13 ambiguous identities**, with per-ID session indices. The [interactive timeline artifact](timelines.html) provides filters and expandable events over the same data. [journeys.csv](evidence/journeys.csv) is the machine-readable extract; [financial-events.csv](evidence/financial-events.csv) retains financial event UUIDs and exposure fields.

### `a69f42dc-5e0a-4330-a647-feeca26fefcd`

October 5, build 17/runtime 4. First seen **20:57:00.680**; completed the observed onboarding sequence. Paywall screen **21:01:14.917**, loaded `onboarding` paywall **21:01:15.299**, trial-containing catalog; arm unrecorded. Annual `com.johansardar.excerlock.premium.a.annual` checkout:

| Start | Result |
|---|---|
| 21:01:26.474 | `cancelled` 21:01:30.258 |
| 21:01:31.202 | `cancelled` 21:01:33.644 |
| 21:01:35.318 | `cancelled` 21:01:48.299 |

Returned to Welcome in a **new session** at **21:54:23.105**, repeated onboarding through O14, last seen **21:54:36.708**. No observed restore/sign-in or subscription. Outcome: **three cancelled checkouts; later onboarding re-entry; no purchase observed**.

### `292f3ba9-4a75-4d5e-bfee-836cbfdced62`

October 12, build 17/runtime 4. First seen **15:59:52.810**; traversed onboarding. Paywall screen **16:02:31.273**, loaded `onboarding` paywall **16:02:32.040**, trial-containing catalog; arm unrecorded. Checkout:

| Start | Product | Result |
|---|---|---|
| 16:02:54.591 | Annual `.a.annual.notrial` | `cancelled` 16:02:59.601 |
| 16:03:18.076 | Annual `.a.annual.notrial` | `cancelled` 16:03:20.814 |
| 16:03:22.875 | Monthly `.a.monthly` | `cancelled` 16:03:26.089 |

No subsequent client activity, restore, sign-in or subscription observed. The catalog's `has_trial=true` does not make the first two selected products trial offers. Outcome: **three cancelled checkouts across annual and monthly plans**.

### `7e4fe984-6338-4b3b-b2e3-f10d45c99632`

October 14, build 17/runtime 4. First seen **11:45:08.028**; traversed onboarding. Paywall screen **11:49:05.751**, loaded `onboarding` paywall **11:49:06.442**, trial-containing catalog; arm unrecorded. Restore **11:49:13.761** → `unavailable` **11:49:14.150**. Annual `.a.annual` purchase **11:49:18.590** → `cancelled` **11:49:24.417**. Returned through earlier onboarding-tail screens in the **same session**, ending at S3 **11:49:31.208**; this was not a full Welcome reset. No subscription or sign-in evidence. Outcome: **not-found restore, cancelled checkout, backwards tail navigation**.

### `2b0c2b33-9bb9-437b-9310-0e8050be117a`

October 18. First seen **02:38:28.506**, initially build 17/runtime 4. Loaded `onboarding` paywalls at **02:43:33.107**, **02:44:10.330** and **02:45:31.158**; each showed a trial-containing catalog, with arm unrecorded. Between the first two views, navigated back through the onboarding tail. Restores:

| Start | Result |
|---|---|
| 02:44:14.091 | `unavailable` 02:44:14.511 |
| 02:44:16.441 | `unavailable` 02:44:16.718 |
| 02:44:17.141 | `unavailable` 02:44:17.478 |

Returned to Welcome **02:44:33.319 in the same session**, repeated onboarding, then started annual `premium.annual.3999.t3` checkout **02:45:33.866**. Production **trial started 02:45:44**, with the three-day duration confirmed by the billing snapshot. Sign-in screen **02:45:49.480**. Later Welcome returns were observed **04:12:40.234** and, on build 21/runtime 6, **04:17:26.761**.

Email sign-in failures on the later session: `REAUTH_DIFFERENT_ACCOUNT` **04:18:16.907** and **04:22:34.020**; `OTP_INVALID` **04:18:17.361**, **04:18:29.193**, **04:22:34.793**, **04:22:49.652**; `EMAIL_RATE_LIMITED` **04:18:38.401**. **Recovered to Home 04:23:52.109**; last client activity **04:24:40.679**.

Trial renewal cancelled **October 19 02:08:26.435**; trial expired **October 21 02:45:44**. Adapty confirms voluntary cancellation and $0 revenue. Outcome: **trial obtained after restore/reset friction; sign-in recovered; cancelled before its first payment**. The records do not establish why it was cancelled.

### `d8665640-fa57-4024-a9f1-d061725f1dd9`

October 19, build 21/runtime 6. First seen **23:06:00.009**, traversed onboarding. Exposure **23:07:26.919** records assigned/rendered **B**. Loaded `onboarding` paywall **23:07:28.458**, `has_trial=false`. Welcome **23:08:12.532 in a new session**; sign-in screen **23:08:15.814**; Home **23:09:37.879**. Continued client activity through **October 21 00:31:40.313**.

No observed checkout/restore/error or Adapty subscription. Successful access could be complimentary or another admission mechanism; Home alone does not prove payment or successful paid-account verification. Outcome: **reached Home after sign-in; revenue/access basis unverified**.

### `45564b12-35c6-490a-9ddc-5ca4b19a5717`

October 21 incident, build 21/runtime 6, update `01a15cb3-ca4a-75e9-b53b-fbf34c0fe5d1`. First seen **15:28:12.037**; traversed onboarding. Exposure **15:32:23.641** records assigned/rendered **B**. Loaded no-trial `onboarding` paywall **15:32:26.161** → **Welcome 15:32:27.939 in the same session** → repeated onboarding → loaded paywall **15:33:13.131** → `paywall_error operation=purchase` **15:33:15.182**.

Sentry network event **15:33:15.041**, [EXCERLOCK-MOBILE-1A](https://edge-ix.sentry.io/issues/EXCERLOCK-MOBILE-1A), event ID `0dbe1e69792848f9acfc6d251188ce73`, reports Adapty `#2005 networkFailed`. Time and bundle align with the client's purchase error and the incident brief; Sentry has no deterministic user identifier. No purchase-start/failure event, subscription, restore, sign-in or subsequent activity was observed. Outcome: **same-session onboarding reset followed by failed checkout**. Telemetry does not identify the selected plan or establish whether StoreKit's sheet was reached.

### Candidates who did not reach a recorded paywall

The other **11 release-eligible IDs** have complete sanitized timelines in [timelines.md](timelines.md). Four experienced Apple provider failures; all four had no current Adapty subscription or later recorded paywall/Home recovery:

| Anonymous ID | Date | Apple failures | Preserved code |
|---|---|---:|---|
| `cfc7dfca-4602-4f81-ab35-4e92834f3f26` | Oct 13 | 4 | Missing; scrubbed `error_code` |
| `0eff4775-5ede-4cd2-bf86-170ebcf841d5` | Oct 14 | 1 | Missing; scrubbed `error_code` |
| `c9752fdd-7f67-4491-9f4c-2488eea0509a` | Oct 15 | 2 | `APPLE_SIGNIN_FAILED_ERR_REQUEST_UNKNOWN` |
| `c10dabc8-118d-4599-b4d7-d29cabf387d4` | Oct 15 | 1 | Same |

`7ae33bf4-f4b5-424e-a9d2-ed926d78f6ad` reached Home on October 18 without a recorded paywall or current Adapty subscription; access basis is unknown. Other timelines stop at onboarding or sign-in. “Last observed” is not evidence of uninstall, and no missing successful-sign-in event is invented.

### Possibly internal / App Review — every ambiguous identity retained

These **13 identities are not silently discarded**. Each is outside the owner's stated commercial release range; role/distribution is not proven. They contribute no commercial lost-revenue estimate. Their complete sequences remain in the [separate timeline section](timelines.md#possibly-internal--app-review-13). [Q13/release-eligibility.csv](evidence/release-eligibility.csv) supplies the model/version/build/runtime evidence.

| Anonymous ID | Observed build/runtime | Reason and observed outcome |
|---|---|---|
| `36670411-56f9-4d58-b1e6-a00a0ba48938` | 8/3 | Earlier than commercial range; repeated early onboarding, no paywall |
| `6236100a-0646-491e-ae95-b07e2cb9d8b8` | 8/3 | Earlier than commercial range; repeated early onboarding, no paywall |
| `afa6d7cc-70f4-45da-ae6f-413faae467b3` | 8/3 | Earlier than commercial range; repeated early onboarding, no paywall |
| `8a83111b-7cab-48a2-b9f6-5832eac6f130` | 9/3 | Earlier than commercial range; early onboarding, no paywall |
| `dd443fb0-d63b-4678-8f91-83d7850919c7` | 9/3 | Earlier than commercial range; repeated early onboarding, no paywall |
| `a9f466c7-09e5-430d-aa02-be06e92efacc` | 10/3 | Earlier than commercial range; repeated early onboarding, no paywall |
| `5016a67f-f22d-419c-ba5d-d18f5a95b445` | 11/3 | Earlier than commercial range; repeated early onboarding, no paywall |
| `787d3b39-d0c9-433e-b90c-df6f39d480de` | 12/4 | Earlier than commercial build range; repeated onboarding, no paywall |
| `cb445c47-e5d4-4017-9a69-6977ef1f2dec` | 12/4 | Earlier than commercial build range; two paywall screens, loaded products unobserved; detail below |
| `df507412-b41f-4c48-b4f0-1565419b5267` | 22/7 | 1.0.2, outside commercial range; five Apple `ERR_REQUEST_UNKNOWN` errors, no paywall |
| `02e35663-69a1-4afd-8f41-d5e3d4439329` | 22/7 | 1.0.2; fresh sign-in session at nearly the same instant as the next ID; distribution/role unknown |
| `988b35d2-b813-4a6c-b6f2-7d2b94c4cb2c` | 22/7 | 1.0.2; simultaneous fresh sign-in activity on a different device; possible review activity, not proof |
| `48da23f2-6892-4285-a15a-8f391433ef35` | 23/7 | iPhone 11 Pro, iOS 27.0.1, 1.0.2; specifically flagged by owner as possibly App Review/owner TestFlight; three Apple `ERR_REQUEST_UNKNOWN` errors, no paywall |

Together the two later-build Apple-error IDs have **eight events**; they account for the difference between all-physical Apple totals (16 events / 6 IDs) and commercial-eligible totals (8 events / 4 IDs). No subscription is present for any of these 13 in the Adapty snapshots. Missing distribution instrumentation prevents stronger classification.

### `cb445c47-e5d4-4017-9a69-6977ef1f2dec`

September 28, build 12/runtime 4. First observed activity **19:04:45.075**. Paywall screens at **19:04:45.569** and **19:05:13.053**, then no further client activity in the window. No onboarding, loaded-paywall, checkout, restore or sign-in evidence was recorded. Placement and arm are unknown. Adapty has no subscription. The five nearby identity errors described above cannot be definitively attributed to this ID. Outcome: **paywall reached; successful product loading/payment unobserved**.

## 3. Analytics-gap root causes and proposed instrumentation

### Client-owned events are removed by a blanket prefix filter

[`PostHogAnalyticsAdapter.ts:147`](../../../app-next/src/packages/telemetry/PostHogAnalyticsAdapter.ts#L147) checks the client allowlist **and then rejects** `/^(purchase|trial|subscription|restore)_/`. [`paywall.ts`](../../../packages/analytics-events/src/events/paywall.ts) still declares `purchase_started`, `purchase_failed`, `restore_started`, `restore_succeeded` and `restore_failed` as **client-owned**. Their call sites remain active in [`PaywallScreen.tsx:106`](../../../app-next/src/packages/paywall/lib/PaywallScreen.tsx#L106) and [`restorePurchases.ts`](../../../app-next/src/packages/subscription/restorePurchases.ts). This is a registry/transport contradiction, not an absence of calls.

Commit `0d6841dcf07d0a8a938186678b9a2f5f43c80724` introduced the filter on October 13. [ADR 0078](../../adr/0078-adapty-onboarding-trial-assignment.md) explicitly specifies it; [0079](../../adr/0079-install-split-onboarding-trial-assignment.md) only supersedes assignment. Removing the filter without reconciling that decision would leave documentation inconsistent. Adapty's authoritative billing/revenue event ownership should remain intact; UI checkout intent/result is a different signal.

[Q06/release-gap.csv](evidence/release-gap.csv) confirms the bundle pattern: builds 20–23 have no starts; older build-17 bundles still emit starts on October 18. Build 21 has three loaded views and a surviving `paywall_error`, but no purchase-start/failure events. Build 22 has no observed loaded paywall either, so its zero cannot independently establish attempted purchases. The source filter establishes the common suppression mechanism.

The same regex also suppresses the **client-owned** [`subscription_verification_failed`](../../../packages/analytics-events/src/events/subscription.ts#L4), despite [`reportVerificationFailure.ts`](../../../app-next/src/packages/journey/lib/reportVerificationFailure.ts) supplying bounded reason/stage/recovery/destination fields. [Q10](evidence/Q10-client-event-coverage.sql) finds none in physical-production client telemetry while Sentry records a timeout.

**Proposal:** reconcile ADR 0078 and the event contract so the existing client-ownership allowlist admits checkout/restore/verification diagnostics, while client code continues to be unable to emit Adapty-owned authoritative billing events. Any renamed/new events or properties require an ADR/schema update under the repository invariants. Do not fabricate a second client revenue stream.

### Earlier Apple error codes were scrubbed

The generic scrubber at [`PostHogAnalyticsAdapter.ts:42`](../../../app-next/src/packages/telemetry/PostHogAnalyticsAdapter.ts#L42) rejects property names containing `error`. The caller formerly sent `error_code`; commit `c3a15159c391880c3061efe1eff2321882149e00` renamed it to `failure_code` on October 14. Across all production-tagged physical IDs, this explains five code-less Apple provider failures across two release-eligible IDs, followed by 11 preserved `ERR_REQUEST_UNKNOWN` failures across four IDs: three events across two release-eligible IDs and eight across two ambiguous later-build IDs. The five missing codes cannot be reconstructed as that same code from titles alone.

**Proposal:** use allowlisted bounded failure enums/codes and validate declared transmitted properties against the privacy scrubber during the existing static checks. Preserve the privacy boundary; do not forward exception text, authentication material or free-form vendor payloads.

### Paywall views mean products loaded, not a visible or usable checkout

[`PaywallScreen.tsx:74`](../../../app-next/src/packages/paywall/lib/PaywallScreen.tsx#L74) emits `paywall_viewed` only after `loadPaywall()` resolves. The mounted screen can therefore be missing from the common funnel. The separate `$screen` signal is also subject to consent/identity gating and screen replay.

**Proposal:** separately record paywall mount, product-load outcome and latency, actionable checkout readiness, close action and destination. Include UI placement, actual catalog placement, assigned/rendered arm, variation, build/runtime/update, and a non-identifying correlation token. Record the close before navigation so a return to Welcome has an explicit cause. Distinguish new-session resume/recovery from the X action.

### Error, restore and purchase outcomes are too coarse

[`paywallErrors.ts:13`](../../../app-next/src/packages/paywall/lib/paywallErrors.ts#L13) sends only `operation`. [`PaywallScreen.tsx:121`](../../../app-next/src/packages/paywall/lib/PaywallScreen.tsx#L121) labels every thrown purchase error `unknown`. There is no shared attempt ID, selected plan on failures, stage timing, retry count, StoreKit-entry signal, or complete client result event for pending/already-owned/success-with-unusable-entitlement cases.

[`restorePurchases.ts:14`](../../../app-next/src/packages/subscription/restorePurchases.ts#L14) names an empty/inactive returned entitlement `unavailable`. All four observed restores preceded any known purchase on those IDs. They are not evidence that four paid purchases disappeared.

**Proposal:** capture bounded checkout stages (`identity`, integration attachment, StoreKit call/result, entitlement verification, account admission), durations, a scrubbed vendor error code, retryability, selected product/currency/quoted amount, and a short-lived attempt correlation token. Emit exactly one client terminal outcome per attempt: cancelled, failed, pending, already-owned, or StoreKit-returned-success. Treat StoreKit success and paid-account admission as separate outcomes; only the vendor/server billing path establishes money received. Give restore an explicit `not_found` outcome and separate transport/authentication/verification failures. Never require an analytics upload to complete checkout.

The audited adapter awaits identity readiness, recovery state and integration attachment before calling StoreKit ([`AdaptySubscriptionAdapter.ts:253`](../../../app-next/src/packages/subscription/AdaptySubscriptionAdapter.ts#L253)). Current telemetry cannot identify which awaited step failed for `#2005`. The lead owns the purchase-path and close-reset fixes; this audit changes no app behavior.

### Install, successful sign-in, admission and some onboarding screens are invisible

Lifecycle capture is disabled at [`PostHogAnalyticsAdapter.ts:35`](../../../app-next/src/packages/telemetry/PostHogAnalyticsAdapter.ts#L35); capture is consent- and canonical-identity-gated at lines 67–71. The identity registry contains only `sign_in_failed`, not sign-in start/success. The semantic onboarding regex at [line 310](../../../app-next/src/packages/telemetry/PostHogAnalyticsAdapter.ts#L310) omits S3e, S4 and S5. S4/S5 have separate research/rating events, while S3e has no equivalent. Queued early screens can be replayed later, so apparent timing/order is not always display timing/order.

**Proposal:** consent-respecting first observed launch/session/resume signals and explicit sign-in start/result, admission and recovery outcome events. Do not call first observed launch an installation. Cover all generic onboarding steps consistently and record bounded navigation causes. Add privacy-safe staff/test/reviewer classification for future reporting; do not infer it from device type or movement patterns. Consent-off people remain outside behavioral analytics by design.

The vendor registry also omits observed `trial_expired` and `subscription_renewal_reactivated` names. Querying only registered names missed the trial expiration in this audit. Reconcile observed vendor vocabulary and environment semantics (`prod` client versus `Production`/`Sandbox` vendor), and document whether event timestamps represent store time or delivery time.

### Sentry removes the fields needed for reliable cross-system attribution

[`telemetry/lib/sentry.ts:40`](../../../app-next/src/packages/telemetry/lib/sentry.ts#L40) removes JavaScript user identity, contexts, breadcrumbs and custom tags, retaining a small release/OTA diagnostic set. This prevents a deterministic join to PostHog and loses financial failure metadata. Native/vendor responses can still contain personal metadata; none is copied into this evidence set.

**Proposal:** a privacy-reviewed, bounded financial diagnostic context and an ephemeral checkout correlation token shared with consented client telemetry. Keep identity, free text and sensitive device/activity context stripped. Do not restore broad user/context/breadcrumb capture merely to make this audit easier.

## 4. Verification limits and completed checks

- **Every real user/install cannot be verified.** Analytics requires consent and ready identity; internal/reviewer classification, installation/uninstallation, successful-sign-in telemetry and a complete account-alias history are absent. The 17-ID release-eligible list and 13-ID ambiguous appendix are explicit and exhaustive only under the stated observable-cohort rule. The incident ID is confirmed real by the owner; store-distribution provenance for the other eligible IDs is not independently captured.
- **Exact attempt counts and failed stages are blocked by suppression.** Historical starts/results cannot be recovered from source changes. Adapty current profiles do not enumerate abandoned checkout attempts, and a network title does not establish the failing sub-operation.
- **Historical billing/refund totals are not fully independently reconciled.** Adapty GETs succeeded for all 35 IDs using `ADAPTY_SECRET_KEY` through the same read-only profile endpoint used by the server. The CLI does not expose full profile history. A current empty subscription map cannot prove there was never an older/transferred purchase.
- **ASC sales/subscriber exports are blocked by missing vendor configuration.** App Store Connect authentication was validated by reading app `6787265352`. Neither `ASC_VENDOR_NUMBER` nor `ASC_ANALYTICS_VENDOR_NUMBER` is configured. A read-only list of existing analytics report requests returned zero; no report request or dashboard state was created. Thus installs, developer proceeds and Apple-side refund totals were not independently checked.
- **The $4,000 figure cannot be established or rejected from these data.** The event window, invisible users, absent attempts, unproven causality and missing sales ledger prevent that calculation. The conditional price scenarios are explicitly weaker evidence.
- **No app or server behavior changed.** No simulator proof was required or run. No messages were sent, production data/dashboard state changed, or branch pushed/merged/released.

Data verification: all 35 Adapty requests succeeded; all three PostHog journey pages reconcile to the independent count; the missing vendor expiration was restored; Q09 independently reconciles client funnel counts; the offline derivation checks the 17/13 cohort split, event totals and subset boundaries. Verification output is [data-verification.txt](evidence/data-verification.txt).

Repository verification: **`./excer check` passed all 23 checks** after `npm ci` installed this worktree's pinned dependencies. Output: [check.txt](evidence/check.txt). Documentation links, cohort/timeline coverage, timestamp references, privacy restrictions and artifact interactions were also checked; output: [document-verification.txt](evidence/document-verification.txt). The artifact was previewed at 728 px in light mode and 360 px in dark mode, with no horizontal overflow; filtering/search and expanded tables passed the preview checks.
