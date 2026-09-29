# Retention offers plan for ExcerLock

*Researched 2026-09-28 on branch `JohanSardar/offers-retention-research`, based on commit `eacebbe8`. Research only: nothing was activated, sent, priced, deployed, pushed or submitted. Apple claims were read in Apple primary text; app claims in this worktree or through read-only `asc` and `adapty` calls.*

**Legend.** **[V]** Apple or other primary text read. **[V\*]** the same, via a fetch-tool extraction; re-check before quoting. **[R]** repo, App Store Connect or Adapty observation. **[P]** vendor or competitor proxy, not ExcerLock data. **[H]** hypothesis or proposed default, untested. **[U]** unverified or not found.

## 1. Bottom line

1. **Several requested mechanics do not exist, or cannot be controlled as described.**
   - *Delete-time offer:* no Apple-owned offer appears when someone long-presses the icon to remove an app. I found none in any Apple source, including Apple's delete-app support page (published Sept 14, 2026) [U]. The nearest real things are Retention Messaging on Apple's cancel page and developer-owned Home Screen Quick Actions beside "Remove App". The app cannot see the Remove App tap.
   - *"Offer Sheet API":* not an Apple-documented name. The real objects are the win-back offer sheet, the offer-code redemption sheet and the manage-subscriptions sheet.
   - *Cancel interception:* impossible. Apple can show a message or offer after the person taps Cancel Subscription; the app learns afterward.
   - *"N minutes after download":* not measurable; the earliest anchor is first launch.
   - *Win-back for never-paid users:* Apple win-back offers go only to lapsed paid subscribers.
2. **Starting position [R].** Build 12 of 1.0, submitted 2026-09-26, is now rejected (reason unread). The app has never been public, has only one-week free trials, and launches at $59.99 annual and $9.99 monthly. Every number below is arithmetic or a proxy, not a forecast.
3. **$24.99 is a real US annual price point** ($17.50 first-year proceeds) [R]. It needs 2.40x the conversion of $59.99 to break even in year 1. I assumed annual USD; $24.99 monthly would be 2.5x the $9.99 base, not a discount. The safest vehicle is an Apple promotional or win-back offer on the standard annual product, which returns to $59.99. A standing $24.99 SKU renews at $24.99 and shows to everyone in its group.
4. **The nine-touch cadence is schedulable, and I recommend against it.** Consent today covers a trial reminder only. DPLA Attachment 1 §2.2, guideline 4.5.4 and the HIG require explicit opt-in and an in-app opt-out for promotional notifications. A purchase elsewhere cannot cancel touches already scheduled. The PRD says "no promotional pushes"; the review notes say "trial reminder only". No proxy tests a first-day burst [P]. Section 5 offers an opt-in, capped alternative.
5. **Fix paywall disclosure before any discount [R].** The plan cards show a per-month figure as the visible price, with no renewal sentence and no Terms or Privacy links. Apple says the billed amount must be the most prominent price [V]. A discount widens that gap.
6. **Guardrails.** No offers targeted or worded from steps, gym, location or Screen Time data. No offer gated on enabling notifications. No fake countdowns or "was" prices. Whether guideline 4.10 ("Screen Time APIs") reaches a paywall on this app is unresolved [U].
7. **No optimum price can be derived.** With linear proceeds, a lower price wins only if conversion rises by the price ratio (section 6, Appendix D). Small Business Program status may matter more: 85% instead of 70% of first-year proceeds (+21.4%), if the account qualifies and is not enrolled [V\*].

## 2. What exists today [R]

| Area | State on 2026-09-28 |
|---|---|
| Release | 1.0 Build 12 submitted 2026-09-26, now REJECTED; the rejection text is not in the API. |
| Launch products | Annual $59.99 (proceeds $42.00 in year 1, $50.99 after) and monthly $9.99 ($7.00, $8.49), each with a one-week free trial. READY_TO_SUBMIT at the last read, not approved. |
| Offers configured | 0 promotional, 0 win-back, 0 offer codes. |
| "Win-back" today | Standalone SKUs `a.winback.annual` $29.99 and `b.winback.annual` $39.99, both MISSING_METADATA (not sellable): ordinary products, not Apple win-back offers. The app opens the Adapty `winback` placement once per session when status is `expired`. |
| Subscription groups | Three: Variant A (launch products), Variant B ($79.99 annual, $12.99 monthly; not sellable) and the 45-SKU grid. The grid has no $59.99 or $24.99 annual. |
| Notifications | Local only: `trial_ending`, `open_to_unlock`, `shield_open`. Permission asked once, at onboarding step S3d, with trial-reminder wording. The single Settings switch is general and gates only `open_to_unlock`. No marketing consent or toggle; no token registration. |
| Paywall and analytics | `$/mo` plan cards; no renewal sentence; Terms and Privacy links only under Settings. `analyticsEnabled` defaults to true; the taxonomy says events follow explicit opt-in. |

## 3. Verdicts on the proposals

| Proposal | Verdict | Why |
|---|---|---|
| $24.99 win-back offer | Possible as an Apple promotional offer (existing, trial-ended or canceled users) or a standalone SKU. Not as an Apple win-back offer for never-paid users. | Win-back needs a lapsed paid subscription [V]. |
| Nine timed notifications | Schedulable; not recommended. | Section 5. |
| Offer when long-pressing the icon to delete | Does not exist as an Apple feature [U]. | A quick action such as "See plans" can sit beside Remove App [V] but cannot detect deletion; new binary. |
| Discount at cancel | Exists only as Apple's Retention Messaging [V]. | Availability here is unverified: Apple's pages disagree [U]. |

## 4. Phased plan

**Phase 0: make 1.0 approvable and measurable. No offers.**
- The Account Holder reads the Build 12 rejection reason; if it cites 3.1.2 or 4.10, resolve that first.
- Fix paywall disclosure: billed amount most prominent, renewal price after any trial, Terms and Privacy links in the flow.
- Capture a baseline over a fixed window: paywall views, trial starts, trial-to-paid, in-trial auto-renew-off (`paywall_viewed`, `purchase_started`, Adapty-owned events, App Store Connect Analytics).
- The Account Holder confirms Small Business Program status.
- *Exit gate:* 1.0 live; baseline window complete.

**Phase 1: Apple-owned surfaces, no new notifications.**
1. Retention Messaging: a default message per product and locale, optionally a promotional-offer message on annual. Configure in App Store Connect if the account has it, or through Adapty's hosted real-time endpoint (Apple approval "up to a month" per Adapty [V]). No app release.
2. Apple win-back offers for lapsed paid subscribers, deeper as the lapse grows (Apple's advice). Creating one triggers iOS 18's default launch sheet; redemption happens in Apple's sheet, not on the paywall. Describe it in the review notes and test in sandbox.
3. An in-app save offer for people who turned auto-renew off before expiry (a pattern Apple names), using a signed promotional offer. `mapProduct` reads only free-trial phases, so a paid offer would show the base price with no discount disclosure. Needs a new binary.
- *Exit gate:* sandbox-verified, review notes updated, each measured against the baseline.

**Phase 2: opt-in reminders, only if Phase 0 and 1 data justify them.** New binary; an ADR replacing PRD §3.14's "no promotional pushes"; separate consent and a Settings toggle; a kill switch in the binary (a new PostHog flag or consumer is new-submission material, `docs/ota.md`); the section 5 cadence. Never by OTA, which would make the review notes false.

**Phase 3: staged price test.** Adapty A/B (ADR 0032 keeps money in Adapty), each user held in one subscription group, at most three arms first, stopping rule fixed in advance. Method and minimum data: Appendix D.

## 5. Notification cadence: proposed, recommended, safest

| | Proposed nine touches | Recommended: opt-in, capped **[H]** | Safety alternative |
|---|---|---|---|
| Timing and anchor | +10 min, 30 min, 2 h, 8 h, 2 d, 4 d, 1 wk, 14 d, 30 d "after download", which is not measurable [V] | Three touches after first launch (stored on device) at day 2, 7 and 21, at least 48 h apart, 09:00-20:00 local | One trial-ending reminder (exists); nothing promotional |
| Consent | Trial-reminder consent only | A separate, unchecked "Offers and tips" choice plus a Settings toggle; never gates an offer or a feature | n/a |
| Reach | Only people who granted permission; nobody who never launches or denied [V] | Same | Same |
| After a purchase elsewhere | Cannot cancel touches already scheduled [V] | Cancelled on next foreground; the cap limits the residue | None needed |
| Measurement | None | Randomized 20% no-touch holdout; net proceeds per exposed user; opt-out, refund, in-trial-cancel rates | n/a |
| Kill criteria | None | Owner sets before launch. Proposed: stop if permission-off or opt-out among treated exceeds holdout by 2 points, refunds or in-trial cancels rise, or App Review or users complain | n/a |
| Policy fit | Conflicts with 4.5.4, DPLA Att. 1 §2.2, HIG, PRD §3.14, review notes | Consistent if consent, toggle, ADR and review notes exist; Apple's subscriptions page names offers to non-subscribers by opted-in push [V] | Lowest risk |

The recommended column is a proposal; its numbers are defaults for the owner to set, not results. Escalating discounts may teach people to wait [H]; Apple's warning about early discounts concerns lapsed subscribers [V].

## 6. Offer ladder by cohort [H]

| Cohort | Apple primitive [V] | Proposed offer | Gate |
|---|---|---|---|
| Never paid, first paywall | Intro offer (exists: one week free) | Keep $59.99 annual and $9.99 monthly with the trial as control. Test one challenger annual price at a time (candidates $49.99, $39.99). | Break-even x1.20 or x1.50; sample size in Appendix D |
| Never paid, left | Nothing native; offer codes ("New subscribers") you distribute | Opt-in reminders back to the same paywall; no invented urgency | Section 5 |
| Trial active | Promotional offers allowed | None; the trial reminder is the touchpoint | Avoid teaching cancel-to-get-a-discount |
| Canceled, not expired | Promotional offer (Apple's recommended cohort); retention message at cancel | One in-app save offer on next open | Kill if in-trial cancels rise |
| Trial ended, never paid | Promotional offer (expired subscriber); offer codes ("Expired"). Not win-back. | Test one first-period offer on the standard annual: $34.99 needs x1.71, $29.99 x2.00, $24.99 x2.40. Pick one. | Cannibalization limit 58%, 50%, 42%; annual duration options unconfirmed [U] |
| Paid, then lapsed | Win-back offer | Deeper as the lapse grows; set the optional 2-24 month wait between offers | Apple: not straight after lapse |
| Paying | Retention message at cancel | Message first; a promotional-offer message only after data | Apple's save rates are averages that vary by developer |

**Monthly alternatives.** On the monthly plan, Apple's shapes are pay-as-you-go (its example: $1.99 a month for 3 months against $9.99), pay up front, or free. The arithmetic is unchanged: half price needs twice the conversion for equal first-period proceeds.

**Fairness.** Lowering the standard price lowers it for every existing subscriber [V], and a cheaper standalone SKU in the same group shows in Manage Subscriptions for everyone [V]. Offers, not new SKUs, are the default vehicle.

## 7. Policy and legal gates

| Source | What it says [V] | What it means here |
|---|---|---|
| 4.10 | "You may not monetize built-in capabilities ... or Apple services and technologies, such as ... Screen Time APIs." | Unresolved for a paywall on a Family Controls app: no precedent, "monetize" undefined. Ask App Review. |
| 3.1.2(a)-(c), Schedule 2 §3.8(b) | No bait-and-switch; no inadvertent multiple subscriptions; disclose title, length and price; Privacy and Terms links in the app | Show offer price, duration, then standard price. |
| 4.5.4, DPLA Att. 1 §2.2, HIG | Promotions need explicit opt-in through in-app consent language and an in-app opt-out; the DPLA names Local Notifications | Separate consent and a toggle. Never Time Sensitive. |
| 5.1.2(i) | May not require enabling push to receive "monetary or other compensation" | Do not gate offers on notifications. |
| 5.1.3(i), DPLA §3.3.3(H), (P) | No marketing use of Motion and Fitness data; no advertising use of Family Controls data | No targeting or copy from steps, gym, location or Screen Time. |
| 5.6, 2.3.1(a) | No tricking users or "promoting a false price"; new features described "with specificity" in the review notes | No struck-through "was" prices or resetting timers. Describe any new schedule or offer in the notes. |
| HIG | "Always make it easy for customers to cancel" | No friction before Apple's cancel sheet. |
| FTC and state law | The 2024 FTC rule was vacated in July 2025; a March 2026 ANPRM asks whether "Saves" are unfair; California §17602(e)(2) allows online save offers only beside a "click to cancel" button | **For counsel.** Not legal advice. |

## 8. Implementation map (no code)

| Item | Source of truth | Where it runs | Notes |
|---|---|---|---|
| Retention message | Apple | Apple, or Adapty's endpoint | Nothing from the app; pause in App Store Connect or Adapty. |
| Win-back offer | Apple eligibility (`eligibleWinBackOfferIDs`) | On device, StoreKit through Adapty | Default sheet at launch; Apple's wait-between-offers limits repeats. |
| In-app save offer | Adapty profile (`willRenew`), Apple eligibility | On device | Once per period; suppress after dismissal; stop by Adapty audience. |
| Opt-in reminders | On-device consent and first-launch marker | Local notifications | Cancel on foreground when entitlement is `trial` or `active`. No steps, gym, location or Screen Time details. |
| Price test | Adapty A/B; ASC proceeds as truth | Adapty | PostHog stays non-monetary (ADR 0032). |
| Events | Coarse, consented | Client analytics | Registered in `packages/analytics-events`; purchase events stay Adapty-owned. |

Localization: US-only, English; Retention Messaging needs a default per product and locale. No email, server push or data migration.

## 9. Questions for the Account Holder

1. What was the Build 12 rejection reason, and does it cite 4.10, 3.1.2 or 5.1.x?
2. Is the account enrolled in the Small Business Program? Does it qualify?
3. Is Retention Messaging in App Store Connect available to this account? Should the real-time interest form be filed (Account Holder only, per RevenueCat [P])?
4. Will you ask Apple Developer Support or App Review (a) how 4.10 applies to a paywall on a Screen Time app, (b) whether any Apple surface exists at app deletion, (c) whether trial-ended users may receive promotional offers?
5. Keep, delete or reserve the standalone $29.99 and $39.99 SKUs?
6. Which single subscription group will hold both price-test arms? Today the launch products, Variant B and the grid sit in three.
7. Fairness: may current $59.99 payers later see cheaper offers, and how much cancel-to-get-a-discount gaming is tolerable?
8. Approve an ADR that replaces "no promotional pushes", and name who sets the kill criteria.
9. Counsel review of auto-renewal and cancellation law.
10. Permit a static "See plans" Home Screen quick action (new binary)? Is analytics-on-by-default intended?

---

# Technical and source appendix

Everything below supports the plan above. Nothing here changes a recommendation. Section references point back to the executive plan.

**Key Apple sources, all read 2026-09-28.** [Introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/); [promotional offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-promotional-offers-for-auto-renewable-subscriptions/); [win-back offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-win-back-offers/); [offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/); [Retention Messaging](https://developer.apple.com/documentation/retentionmessaging); [WWDC26 session 309](https://developer.apple.com/videos/play/wwdc2026/309/); [App Store subscriptions](https://developer.apple.com/app-store/subscriptions/); [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Schedule 2](https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf); [Human Interface Guidelines: managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications); [Apple Support: delete an app](https://support.apple.com/en-us/101550); [What's new for the App Store](https://developer.apple.com/app-store/whats-new/).

**Appendices.** A: primary sources and excerpts. B: eligibility, primitives and precedence. C: repo, App Store Connect and Adapty observations. D: economics. E: notification platform semantics. F: QA matrix, instrumentation and rollout gates. G: vendor and competitor proxies. H: what is unverified, and how to settle it.

## Appendix A. Primary sources and excerpts

All sources were retrieved on 2026-09-28. Apple DocC pages print "(c) 2026" and no modified date; other page dates are shown where the page prints one. **V** rows were read from raw page, JSON or PDF text saved locally. **V\*** rows came through a fetch-tool extraction, so the wording should be re-checked before it is quoted outside this repo.

### A1. Offers and subscription economics (Apple)

| Ref | Claim | Excerpt | Source | Status |
|---|---|---|---|---|
| A1.1 | One introductory offer per person per group | "each person is only eligible to redeem one introductory offer per subscription group" | ASC Help, Set up introductory offers: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/ | V |
| A1.2 | A trial used on one product blocks the group | "if a customer uses a free trial and then upgrades to a subscription product in the same group that also has a free trial, they aren't eligible for the second offer." | same | V |
| A1.3 | Promotional offers: audience, stacking, cap | "for existing and previously subscribed customers" / "Customers can accept the offer even if they've already accepted an introductory offer." / "You can have up to 10 active offers per subscription." | ASC Help, Set up promotional offers: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-promotional-offers-for-auto-renewable-subscriptions/ | V |
| A1.4 | Promotional eligibility, timing, price after the offer | "The App Store deems all customers with an existing or expired subscription in the app eligible to redeem a promotional offer." / "When a customer redeems a promotional offer, the offer period starts at the next billing event." / "Once the offer period concludes, a promotional offer auto-renews at the standard price." | StoreKit, Implementing promotional offers in your app: https://developer.apple.com/documentation/storekit/implementing-promotional-offers-in-your-app | V\* |
| A1.5 | The promotional-offer signature may name an appTransactionID, even for people who never bought | Payload field `transactionId`: "The unique identifier of any transaction that belongs to the customer. You can use the customer’s appTransactionID, even for customers who haven’t made any Apple In-App Purchases in your app. This field is optional, but recommended." Whether a never-subscribed person can actually redeem is not documented. | https://developer.apple.com/documentation/storekit/generating-jws-to-sign-app-store-requests | V ; redemption U |
| A1.6 | Apple's recommended promotional cohort | "To identify subscription in this cohort, you can use StoreKit "RenewalStateProperty = subscribed" and renewal info property "willAutoRenew = false."" | Tech Talk 111386 (2024-02-14): https://developer.apple.com/videos/play/tech-talks/111386/ | V |
| A1.7 | Win-back scope | "Win-back offers are configured per subscription product, not per subscription group. Customers are only eligible for win-back offers for their most recently lapsed subscription product within each group" | ASC Help, Set up win-back offers: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-win-back-offers/ | V |
| A1.8 | Win-back needs paid history | "Choose any value between 1 and 24 months, or 3, 4, and 5 years." (Minimum Paid Duration). Time Since Last Subscribed: minimum 1 month, maximum 24 months. Wait Between Offers: "between 2 and 24 months. This field is optional." | same | V |
| A1.9 | Win-back prerequisites and limits | "Your subscription needs to be approved by App Review before you can create a win-back offer." / "The earliest you can schedule your offer to go live is one day after today, and the event must run for a minimum of 3 days." / "a maximum of 350 win-back offers per subscription. You can run a maximum of 5 win-back offers per storefront, per subscription at a time." / "After you've created your offer, you can't change the price." | same | V |
| A1.10 | Billing retry and grace are excluded | "Subscriptions in a Billing Grace Period or billing retry state aren't eligible for win-back offers." | StoreKit, eligibleWinBackOfferIDs: https://developer.apple.com/documentation/storekit/product/subscriptioninfo/renewalinfo/eligiblewinbackofferids | V\* |
| A1.11 | Default win-back sheet at launch | "By default, StoreKit automatically displays a win-back offer sheet to eligible customers when the app launches. You can choose to suppress (or delay) this sheet using the Message API" | StoreKit, Merchandising win-back offers: https://developer.apple.com/documentation/storekit/merchandising-win-back-offers-in-your-app | V |
| A1.12 | Offer-code cohorts | "New subscribers: Customers who have never subscribed to any subscription product within the group." Existing subscribers include "subscribers in billing retry or a grace period, as long as auto-renew remains enabled." Expired subscribers have "auto-renew ... turned off and subscription period has ended." | ASC Help, Set up offer codes: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/ | V (cohort 1); V\* (2, 3) |
| A1.13 | Offer codes need a live app | "In order for customers to redeem codes, your app must be in the Ready for Sale state." | same | V |
| A1.14 | Apple's caution on discount timing | "providing discounts as soon as your customer's subscription ends may lead to unintended behavior, as users may cancel their plans in order to receive discounts" / "consider giving deeper discounts as the amount of time churned continues to grow" / "avoid sending the customer too many offers to prevent the behavior from feeling spammy" / "over 90 percent of customers cancel plans with at least two days of service remaining" | Tech Talk 111386 | V |
| A1.15 | Save offer after auto-renew is turned off | "Display a save offer in your app to a subscriber who has turned off auto-renew but their subscription hasn't expired yet." | Subscriptions page: https://developer.apple.com/app-store/subscriptions/ | V |
| A1.16 | Marketing push for an offer is allowed with opt-in | "You can also use push notifications to market your content — for example, promoting a subscription offer to people who haven't yet subscribed. However, people must first explicitly opt in to receiving marketing push notifications via a method within your app that includes consent language and a clear way of opting out." | same | V |
| A1.17 | Billed amount must lead | "In the purchase flow, the amount that will be billed must be the most prominent pricing element in the layout." / "While you may also present a breakdown price that the annual amount is equivalent to or a savings when compared to weekly or monthly subscriptions, these additional elements should be displayed in a subordinate position and size to the annual price." Sign-up screens need "Full renewal price, shown clearly and prominently". | same | V |
| A1.18 | Commission and tenure | "During a subscriber's first year of service, you receive 70% of the subscription price at each billing cycle, minus applicable taxes. After a subscriber accumulates one year of paid service, your net revenue increases to 85% of the subscription price, minus applicable taxes." / "Days of paid service include all subscription offer types (introductory, promotional, and offer codes) with paid pricing options (pay as you go, pay up front). Free trials and renewal extensions are excluded from days of paid service." / "Days of paid service are specific to each subscription group." | same | V |
| A1.19 | Small Business Program | "If you're currently enrolled in the App Store Small Business Program, you receive 85% of the subscription price at each billing cycle (minus applicable taxes), regardless of whether or not the subscription has accumulated one year of paid service." | same | V |
| A1.20 | Multiple groups reset tenure and bill separately | "Multiple subscription groups aren’t recommended for apps in which people would expect to have a single active subscription." / "People who buy subscriptions in multiple groups are billed separately for each subscription. Keep in mind that if someone cancels a subscription in one group and then purchases a new subscription in a different group, the renewal date will change and the days of paid service will reset." | same | V |
| A1.21 | Commission clause | "Solely for auto-renewing subscription purchases made by customers who have accrued greater than one year of paid subscription service within a Subscription Group ... Apple shall be entitled to a commission equal to fifteen percent (15%) of all prices payable by each End-User for each subsequent renewal." Prices are "net of any and all taxes collected". | DPLA Schedule 2 §3.4(a), PDF footer "v126 / 17 December 2025": https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf | V |
| A1.22 | US-only note | Monthly subscriptions with a 12-month commitment are "available worldwide ... with the exception of the United States." | What's New: https://developer.apple.com/app-store/whats-new/ | V |

### A2. Retention Messaging and the cancel flow

| Ref | Claim | Excerpt | Source | Status |
|---|---|---|---|---|
| A2.1 | It runs after Cancel Subscription is tapped | "The system displays the retention message to the customer after they tap Cancel Subscription on a subscription details page." | https://developer.apple.com/documentation/retentionmessaging | V |
| A2.2 | Real-time flow: active subscribers only | "The real-time messaging flow calls your server when an active subscriber views a subscription details page with a Cancel button." | same | V |
| A2.3 | OS floor | "Retention messages are visible only to devices running iOS 15.1 or later, iPadOS 15.1 or later, visionOS 1 or later, or macOS 14 or later." | same | V |
| A2.4 | Default per product and locale | "The system doesn't display a retention message for a product in any locale that lacks a default retention message." | same | V |
| A2.5 | Latency budget | "Your server needs to respond quickly, within 700 ms in the production environment; otherwise, the App Store server times out and the request fails." | https://developer.apple.com/documentation/retentionmessaging/responding-to-realtime-retention-messaging-requests | V |
| A2.6 | Real-time API is a pre-release with an access request | "To learn more about this pre-release and express interest, see [Request access to the Retention Messaging API]." (the bracket is a link to https://developer.apple.com/contact/request/retention-messaging-api/) | https://developer.apple.com/documentation/retentionmessaging | V |
| A2.6b | The API documents four message types; offers need the real-time flow | "There are four types of retention messages:" a text message (bullets allowed); the same with an image; "A switch-plan message, which contains text and a suggested subscription the customer may choose to switch to"; "A promotional-offer message, which contains text and a promotional offer to continue service at a discounted price, either at the same or a different tier of service". "Default messages can display only text-based messages with or without images or bullet points. To provide retention messages that include offers, use the real-time messaging flow." This describes the API path. WWDC26 309 (A2.7) describes the App Store Connect path, which adds offers without a server. | same | V |
| A2.7 | App Store Connect path | "Retention Messaging in App Store Connect is a wonderful way to provide value to your customers in the subscription cancellation flow and is open to all." / "We are also introducing retention offers, a new offer type for retention messages." / "Retention Messaging supports three different views: a message only, a message and an image, or a message and an offer." | WWDC26 session 309: https://developer.apple.com/videos/play/wwdc2026/309/ | V |
| A2.8 | Apple's own results, with its caveat | "Subscriptions that have adopted Retention Messaging experience an average save rate increase of +1.4 points equivalent to an 82% increase, with promotional offer messages achieving the highest observed save rate at +5.5 points equivalent to a 223% increase." / "Note that we have observed varying results across developers." | same | V |
| A2.9 | Timing conflict on availability | What's New: "Configure Retention Messages in App Store Connect, or use the Retention Messaging API to more directly interact with your subscribers in real time and configure additional options. Coming this fall." Apple Newsroom, June 8, 2026: "Retention Messaging is rolling out to all developers in App Store Connect. These new tools let developers engage subscribers by allowing them to provide additional value during the cancellation process with tailored communications or special offers." I found no App Store Connect release note, Developer News item or help page confirming general availability through 2026-09-24. | https://developer.apple.com/app-store/whats-new/ ; https://www.apple.com/newsroom/2026/06/apple-expands-app-store-capabilities-to-help-developers-grow-and-reach-new-users/ | V ; V ; absence: U |
| A2.10 | Apple's report for it | "The Retention Messaging report shows how users respond to retention messages displayed during the subscription cancellation flow." History: "On request, data is available beginning from April 20, 2026." Save types: "Switch plan", "Redeem offer", "Don’t cancel". | https://developer.apple.com/documentation/analytics-reports/app-store-retention-messaging | V |
| A2.11 | Adapty hosts the endpoint | "Adapty runs that endpoint for you: you write, localize, and test messages in the Adapty Dashboard, and Adapty answers Apple automatically. No backend to build, no app release." / "Apple's approval for your app. Apple's review takes up to a month, so submit the request early." | Adapty docs, retention-messaging: https://adapty.io/docs/retention-messaging | V |
| A2.12 | The in-app manage sheet is Apple's own UI | "The showManageSubscriptions(in:) function presents a manage subscription sheet that's the same as what customers can view in their account settings" | https://developer.apple.com/documentation/storekit/appstore/showmanagesubscriptions(in:) | V\* |
| A2.13 | The app is notified, it does not intercept | "When you use StoreKit APIs, your app is notified when someone chooses to cancel their subscription." Timing is not stated; whether `Status.updates` fires on an auto-renew toggle is not documented. | HIG, In-app purchase: https://developer.apple.com/design/human-interface-guidelines/in-app-purchase | V ; timing U |
| A2.14 | Cancellation must stay easy | "Always make it easy for customers to cancel an auto-renewable subscription. If the manage subscription action is deep within an app — or hard to recognize — subscribers can feel they're being discouraged or prevented from canceling." | same | V |
| A2.15 | Server-side cancel signal | `DID_CHANGE_RENEWAL_STATUS` with subtype `AUTO_RENEW_DISABLED`: the customer turned off auto-renew. Apple calls the service "real-time"; no SLA or retry figures are on the page for renewal-status changes. | https://developer.apple.com/documentation/appstoreservernotifications/notificationtype | V\* ; latency U |

### A3. Deleting an app: what Apple documents

| Ref | Claim | Excerpt | Source | Status |
|---|---|---|---|---|
| A3.1 | The delete steps show no offer | "Touch and hold the app." "Tap Remove App." "Tap Delete App, then tap Delete to confirm." The page lists no offer, no prompt and no developer hook. Re-read live on 2026-09-28: "Published Date: September 14, 2026". An earlier copy I read was dated December 18, 2025 and had the same steps. | Apple Support, Delete apps on your iPhone or iPad: https://support.apple.com/en-us/101550 | V |
| A3.2 | Deleting does not cancel | "Cancel any in-app subscriptions that you don't need. If you delete an app, it doesn’t automatically cancel in-app subscriptions." | same | V |
| A3.3 | Older Apple wording about a Cancel Subscriptions option | 2021 copy ("Published Date: June 28, 2021"): "If you delete an app, it doesn’t cancel in-app subscriptions that you might have. While deleting an app, you might see a Cancel Subscriptions option. Learn how to cancel your subscriptions." That sentence is absent from the September 14, 2026 copy (re-read today), and my earlier reads of the 2024 and December 2025 copies did not have it either. | Internet Archive copy of https://support.apple.com/en-us/HT207618 (now 101550) | V (archived) |
| A3.4 | iOS 13-era alert (secondary only) | "“Do you want to keep the subscription for this app?” the message reads, before giving you a link to manage your Apple ID subscriptions." A reminder, not an offer. Current iOS 26 and 27 behavior is unverified. | The Verge, 2019-06-18: https://www.theverge.com/2019/6/18/18683357/apple-ios-13-beta-2-app-uninstall-manage-subscription-scam | S ; U |
| A3.5 | Apple's quick-action menu also holds Remove App | "In addition to app-specific actions, a Home Screen quick action menu also lists items for removing the app and editing the Home Screen." / "you can provide a total of four." | HIG, Home Screen quick actions: https://developer.apple.com/design/human-interface-guidelines/home-screen-quick-actions | V\* |
| A3.6 | Static quick actions show before first launch | "After a user first installs your app and before they first launch it, pressing your Home Screen icon displays only the app's static quick actions." | https://developer.apple.com/documentation/uikit/uiapplicationshortcutitem | V |
| A3.7 | No deletion callback (community answer, not an Apple statement) | "No, there's no function call or method called when your application is getting deleted (or about to get deleted)." | Apple Developer Forums thread 13846 (Aug 2015): https://developer.apple.com/forums/thread/13846 (read through a search-engine text copy; Apple's bot check blocks direct fetches today) | S |
| A3.8 | APNs 410 is not an uninstall signal | "The 410 status was never meant to be a signal for developers to determine that the app has been uninstalled." | Apple engineer on Apple Developer Forums thread 747482 (Feb 2024): https://developer.apple.com/forums/thread/747482 (same access note) | V\* |
| A3.9 | App Store Connect has an aggregate Deletions metric only | "The number of times your app was deleted on devices running a minimum of iOS 12.3, macOS 11, tvOS 9, or visionOS 1. This data includes deletions of the app from the Home Screen and deletions of the app through Manage Storage." Based on opted-in users. | https://developer.apple.com/help/app-store-connect-analytics/reference/metrics-definitions/ | V\* |
| A3.10 | Where the "delete-menu offer" idea comes from: a developer-owned tactic, not an Apple feature | Two owa.ai items. LinkedIn post, 2026-08-04: “We walk through Apple's new Retention Messaging API (that "From the Developer" note on the cancel screen), and how to drop a save offer right above "Remove App" when someone goes to delete your app.” LinkedIn article, 2026-07-30: “You own the top of that menu. You decide what sits above Remove App”, and, for one app whose long-press menu already held "Log Today" and "Assistance", an added line reading “Too expensive? Use code SOBERLIFE50.” The company blog post "How to Set Up Apple's Retention Messaging API (and a Delete-Menu Save Offer)" returns HTTP 404. I found no sentence saying that Apple itself shows an offer at deletion. | https://www.linkedin.com/posts/owa-ai_how-to-set-up-apples-retention-messaging-activity-7490361480845103104-91Vx ; https://www.linkedin.com/pulse/re-engagement-how-win-back-churned-subscribers-owa-ai-x8lsf | S ; U |
| A3.11 | Search for an Apple-owned delete-time offer | Not found in: the WWDC26 session 309 transcript, the June 8 2026 Newsroom article, the App Store "What's New" page, the Retention Messaging docs, the Analytics Reports page, the iOS 27 release notes copy read (titled "Beta 6"), Developer News through 2026-09-18, or the WWDC26 210, 2025 241 and 2024 10110 sessions. The Newsroom article mentions cancellation only in the Retention Messaging sentences. | as listed | absence: U |

### A4. Guidelines, DPLA and HIG

App Review Guidelines page footer: "Last Updated: June 8, 2026" (https://developer.apple.com/app-store/review/guidelines/). DPLA web copy revision marker: "LYL255 August 18, 2026" (https://developer.apple.com/support/terms/apple-developer-program-license-agreement/). "Screen Time" appears once in the guidelines, in 4.10. "Family Controls", "ManagedSettings" and "DeviceActivity" do not appear. The guidelines contain no text on win-back, promotional or introductory offers, on discounts at cancellation, or on app deletion.

| Ref | Rule | Excerpt | Status |
|---|---|---|---|
| A4.1 | 4.10 | "You may not monetize built-in capabilities provided by the hardware or operating system, such as Push Notifications, the camera, or the gyroscope; or Apple services and technologies, such as Apple Music access, iCloud storage, or Screen Time APIs." | V |
| A4.2 | 4.5.4 | "Push Notifications must not be required for the app to function, and should not be used to send sensitive personal or confidential information. Push Notifications should not be used for promotions or direct marketing purposes unless customers have explicitly opted in to receive them via consent language displayed in your app's UI, and you provide a method in your app for a user to opt out from receiving such messages. Abuse of these services may result in revocation of your privileges." The word "local" does not occur in 4.5.4. | V |
| A4.3 | DPLA Attachment 1 §2.2 (Local Notifications) | "You may not use the APN or Local Notifications for the purposes of advertising, product promotion, or direct marketing of any kind (e.g., up-selling, cross-selling, etc.), including, but not limited to, sending any messages to promote the use of Your Application or advertise the availability of new features or versions, unless the end user has explicitly opted in to receive them via consent language displayed in Your Application's user interface, and You provide a method in Your Application for the end user to opt out from receiving such messages." | V |
| A4.4 | DPLA Attachment 1 §2.1, §2.3, definition | §2.1: "You may not use the APN or Local Notifications for the purpose of sending unsolicited messages to end users". §2.3: "...unduly burden an Apple-branded product or an end user with excessive Push Notifications or Local Notifications, as may be determined by Apple in its reasonable discretion." Definition: "“Local Notification” means a message, including any content or data therein, that Your Application delivers to end users at a pre-determined time". | V |
| A4.5 | 5.1.2(i), last sentence | "Your app may not require users to enable system functionalities (e.g. push notifications, location services, tracking) in order to access functionality, content, use the app, or receive monetary or other compensation, including but not limited to gift cards and codes." | V |
| A4.6 | 5.1.3(i) | "Apps may not use or disclose to third parties data gathered in the health, fitness, and medical research context—including from the Clinical Health Records API, HealthKit API, Motion and Fitness, MovementDisorder APIs, or health-related human subject research—for advertising, marketing, or other use-based data mining purposes other than improving health management, or for the purpose of health research, and then only with permission." | V (opening clause) |
| A4.7 | DPLA §3.3.3(H) and (P) | (H): the app "may not use the HealthKit APIs or the Motion & Fitness APIs, or any information obtained through" them "for any purpose other than providing health, motion, and/or fitness services". (P): the Family Controls Framework needs "a primary purpose of" family controls or "offering individuals the ability to manage their devices to enable focus and productivity"; "You may not use or share such device or usage data for purposes of advertising or advertising measurements". It is silent on charging. | V (H); V\* (P) |
| A4.8 | 3.1.2(a), (b), (c) | "This includes apps that attempt to trick users into purchasing a subscription under false pretenses or engage in bait-and-switch and scam practices" / "Users should have a seamless upgrade/downgrade experience and should not be able to inadvertently subscribe to multiple variations of the same thing." / "Before asking a customer to subscribe, you should clearly describe what the user will get for the price." | V |
| A4.9 | DPLA Schedule 2 §3.8(b) | "You clearly and conspicuously disclose to users the following information regarding Your auto-renewing subscription:" followed by three bullets: "Title of auto-renewing subscription, which may be the same as the in-app product name", "Length of subscription", "Price of subscription, and price per unit if appropriate". Then: "Links to Your Privacy Policy and Terms of Use must be accessible within Your Licensed Application." | V (Schedule 2 PDF v126, 17 December 2025) |
| A4.10 | DPLA Schedule 2 §3.10 | "To the extent You promote and offer for sale auto-renewing subscriptions, within or outside of Your Licensed Application, You must do so in compliance with all legal and regulatory requirements." | V |
| A4.11 | 5.6 and 2.3.1(a) | 5.6: "Apps should never prey on users or attempt to rip off customers, trick them into making unwanted purchases, force them to share unnecessary data, raise prices in a tricky manner, charge for features or content that are not delivered, or engage in any other manipulative practices within or outside of the app." 2.3.1(a): "All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect", and "promoting a false price" is grounds for removal. | V |
| A4.12 | HIG, marketing notifications | "Don't use notifications to send marketing or promotional content unless people explicitly agree to receive such information." / "Never use the Time Sensitive interruption level to send a marketing notification." / "you must also provide an in-app settings screen that lets people change their choice" Apple's own example: "people who use a subscription app might appreciate getting an offer to become a subscriber". | HIG, Managing notifications: https://developer.apple.com/design/human-interface-guidelines/managing-notifications ; V (first three); V\* (example) |
| A4.13 | HIG, repeat notifications | "Avoid sending multiple notifications for the same thing, even if someone hasn't responded." | HIG, Notifications: https://developer.apple.com/design/human-interface-guidelines/notifications ; V |

### A5. Legal context, for counsel

Not legal advice. None of this was analysed beyond quoting the text.

| Ref | Item | Excerpt | Source | Status |
|---|---|---|---|---|
| A5.1 | FTC 2024 amendments vacated; 1973 rule back | "the United States Court of Appeals for the Eighth Circuit vacated the amended Rule" (July 8, 2025) / "The Eighth Circuit's vacatur reinstated the prior version of the Rule which was first promulgated in 1973." | FTC ANPRM, March 2026: https://www.ftc.gov/system/files/ftc_gov/pdf/p064202negativeoptionruleanprm.pdf | V |
| A5.2 | FTC asks about save offers | "Is it unfair or deceptive to offer discounts or other incentives to remain enrolled in a negative option program (“Saves”) instead of promptly honoring a consumer's request to cancel?" I found no later proposed rule; that negative rests on two searches. | same | V ; absence U |
| A5.3 | FTC dark-pattern staff report (2022) | Taxonomy entries include "Baseless Countdown Timer", "False Limited Time Message" (described as "Creating pressure to buy immediately by saying the offer is good only for a limited time or that the deal ends soon – but without a deadline or with a meaningless deadline that just resets when reached"), "False Discount Claims", "Nagging" and "Roadblocks to Cancellation". A staff report, not a rule. | https://www.ftc.gov/reports/bringing-dark-patterns-light | V |
| A5.4 | California online save offers | §17602(e)(2): a business "may display a discounted offer, retention benefit, or information regarding the effects of cancellation, provided that the business simultaneously displays a prominently located and continuously and proximately displayed direct link or button entitled "click to cancel,"". The page footer reads "(Amended by Stats. 2024, Ch. 515, Sec. 2. (AB 2863) Effective January 1, 2025.)". §17602(j): "The amendments made to this section by the act adding this subdivision shall only apply to a contract entered into, amended, or extended under this article on or after July 1, 2025." Who counts as "the business" for an Apple-billed subscription is not answered in any source read. | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602 | V |
| A5.5 | Other regimes not researched | State auto-renewal laws other than California, CAN-SPAM, TCPA, COPPA, and Texas SB 2420 (age assurance for downloads and in-app purchases, per Apple news of June 3, 2026). | | U |

## Appendix B. Eligibility, primitives and precedence

Sources are Apple text unless marked. "Ax.y" points to a row of Appendix A. This appendix answers "who can be offered what, when, and who decides".

### B1. Eligibility and state matrix

**Y** = the state is in the offer's documented audience. **N** = documented as outside it. **C** = conditional on further Apple or configuration criteria. **S** = Apple's docs are silent, so this is not established. Promotional offers additionally need your server signature and your own criteria (A1.4). "Trial-active" means inside the free introductory trial with auto-renew on. "Lapsed, never paid" means expired after a trial only, which is the cohort ExcerLock produces when a one-week trial ends unpaid.

| State | Intro offer | Promotional offer | Offer code | Win-back offer | Retention message | In-app manage sheet |
|---|---|---|---|---|---|---|
| Never paid (no transaction) | **Y**: "New subscribers are always eligible." | **N** by the stated audience (A1.4); whether Apple enforces it for someone who never subscribed is not documented (A1.5) | **Y** if the code targets "New subscribers" (A1.12) | **N**: needs paid history (A1.8) | **N**: real-time flow needs "an active subscriber" (A2.2) | **S**: the sheet shows "the customer's currently active subscription" (A2.12) |
| Trial-active | **N**: a used trial blocks the group (A1.2) | **Y**: applies "at the next billing event" (A1.4); allowed after an intro offer (A1.3) | **C**: "Existing" cohort only | **N**: not churned | **S** for trials; Adapty says "Trial cancellations are also subject to retention messaging" [V, vendor doc] | **Y** |
| Canceled, not expired (`willAutoRenew = false`) | **N**: existing subscriber | **Y**: Apple's own recommended cohort (A1.6) | **C**: Apple lists a save offer for this state (A1.15); the cohort mapping is not spelled out | **N**: churned means expired (A1.7) | **S**: inferred **N**, because the trigger is a Cancel button on an active subscription | **Y** |
| Billing retry or grace | **N** | **S**: Apple advises not to merchandise to customers in billing retry (Tech Talk 111386) | **C**: "Existing" includes retry or grace "as long as auto-renew remains enabled" (A1.12) | **N** (A1.10) | **S** | **S** |
| Lapsed, never paid (trial only) | **N**: the trial used the group's intro offer | **Y**: "an existing or expired subscription" is in the audience (A1.4) | **Y** via "Expired subscribers" (A1.12) | **N** by the criteria: Minimum Paid Duration is at least 1 month (A1.8). Whether a trial-only churner could count is not documented **[U]** | **N** | **S** |
| Prior paid, then lapsed | **C**: only if no intro offer was ever used in the group | **Y**: "previously subscribed" (A1.3) | **Y** via "Expired subscribers" | **C**: paid duration, months since lapse, wait between offers, a live offer, and the most recently lapsed product (A1.7-A1.9) | **N** | **Y**: win-back shows on the Subscriptions page and in-app (A1.11) |
| Current paid (auto-renew on) | **N** | **Y**: one active at a time | **C**: "Existing" cohort; upgrade or same level only | **N** | **C**: target audience; the real-time API needs access, and App Store Connect availability is unconfirmed (A2.6, A2.9) | **Y** |

Reading for ExcerLock: never-paid people can be reached only by the introductory offer that already exists and by offer codes set to "New subscribers". Everyone else needs a lapse, a cancel or a paid history first. There is no column for a delete-time offer because I found none in any Apple source (A3.1-A3.11): Apple's delete-app page lists no offer for any state, and says only that deleting an app "doesn’t automatically cancel in-app subscriptions" (A3.2).

### B2. Primitives, Adapty 4.0.2 and this app today

| Primitive | Apple | Adapty SDK 4.0.2 [R: installed package] | App today [R] | What it would need |
|---|---|---|---|---|
| Introductory offer | New subscribers per group; free or paid | Applied automatically only when StoreKit says eligible | Free trial only; a paid intro would show no label | Label paid offers with price and duration; add a renewal sentence |
| Promotional offer | Existing or lapsed subscribers; JWS-signed; up to 10 active | Yes: dashboard offer per product, In-App Purchase key, one offer per product | None configured; a free one would be labelled "trial" and a paid one would be undisclosed | Render by offer type and phase; disclose discounted price, length and renewal price; upload the key; sandbox test |
| Win-back offer | iOS 18+ sheet; churned only; per product; at most 5 running per storefront | Yes: `win_back` type; iOS 18+ only; no profile field; no analytics filter value | None. Apple's default sheet would appear unhandled, and redemption would skip the paywall | Decide sheet handling (native code); keep distinct from the standalone "Win-back A" SKU |
| Offer codes | One-time and custom; in-app redemption from iOS 14 | Redeem-only sheet (StoreKit 1, deprecated in iOS 18); cannot pick `.code` at purchase | None | Optional Settings entry, preferably Apple's redemption URL; the transaction path already flows through `Transaction.updates` |
| Retention Messaging | API or App Store Connect; approval; promotional or switch-plan messages | Hosted by Adapty; no app release | Nothing needed in the app | Apple access, key in Adapty, sandbox performance test, message review; a promotional message needs an Apple promotional offer plus the key |
| Audience targeting | n/a | Segments and audiences per placement | Three placements chosen by the client; 0 segments | Segments in the dashboard; a new placement id needs a code change |
| A/B tests, including price | n/a | Yes; needs at least two paywalls; `logShowFlow` | `logShowFlow` wired at `subscription/AdaptySubscriptionAdapter.ts:158-162`; the PostHog paywall experiment is separate | Dashboard setup; keep the two experiment systems distinct (ADR 0032) |
| Lifecycle messaging | n/a | Developer-facing push only; tags to OneSignal, Braze, Pushwoosh; webhooks | Local `trial_ending` only | See Appendix E |
| Cancel intent | Manage Subscriptions page; win-back shown there from iOS 14.3 | No manage helper; `willRenew` and `unsubscribedAt` on the profile | Opens Apple's page; `willRenew` is on `Entitlement` but unused | Any pre-cancel screen is app-built and cannot block Apple's sheet |

Adapty facts behind the table, from `adapty.io/docs` on 2026-09-28: "you can add only one offer for each product."; products and offers on a paywall can be changed only "while it's in the Draft state, or within 30 days of creating it if it has no transactions yet", while "Flows don't have this restriction"; "Introductory offers on iOS are applied automatically if the user is eligible. Do not add them to Adapty."; "Once a test is live, it cannot be changed."; "Stopping an A/B test is irreversible — the test cannot be restarted."; A/B tests on paywalls need "At least two paywalls." [V, Adapty docs; vendor claims about Adapty's own product]. Adapty's stated discount pattern is a separate SKU plus audiences: "Create a separate product without offers in Adapty, add paywalls containing both product variants to a placement, and use audience segments to control which paywall is displayed to different users." That pattern is what ExcerLock's standalone "Win-back A" SKU follows, and it has the cannibalization property described in section 6 of the plan.

### B3. Which offer wins when several apply

Apple publishes no cross-type order [U]. What it does say:

| Situation | Text | Status |
|---|---|---|
| Overlapping win-back offers | "If offers overlap, Apple automatically selects and displays one offer to eligible customers based on price, duration, and other factors such as the customer's paid subscription tenure." `eligibleWinBackOfferIDs` is "sorted with the best offers first." | V ; V\* |
| StoreKit views | "If you return nil and the customer is eligible for an introductory offer, the app always displays the introductory offer in the view." | V (merchandising article) |
| Retention offers in App Store Connect | "The App Store will automatically choose the best offer for eligible customers, so you can select multiple offers for a single subscription with confidence." | V (WWDC26 309) |
| Offer code and intro | An App Store Connect setting: redeem the intro offer first, then the code offer, or the code first then the standard price. | V |
| Promotional and promotional | "the current offer is canceled in the following billing event and the new offer takes effect." | V\* |
| Win-back and promoted purchases | "If you choose to promote a win-back offer, it will replace any In-App Purchase promotions in the same storefront." | V |

**Adapty precedence conflict [R + V].** The docs say: "eligible users will receive the introductory offer first. After its period ends, if the user is still eligible for the promotional offer and you've configured this offer in Adapty, it will be applied when they attempt to purchase the product again." The installed iOS SDK (4.0.2) `determineOfferFor` reads differently: an eligible win-back offer first, then a configured promotional offer with no introductory-eligibility check, then an eligible introductory offer, then none (`Sources/StoreKit/PaywallProduct+offers.swift:30-42, 119-179` in the local `AdaptySDK-iOS` 4.0.2 checkout under Xcode's SourcePackages, commit 51492837; not in this repo; derived, no single quote). Design around the code, then settle it with one sandbox purchase before relying on either.

### B4. What "Offer Sheet API" could mean

Apple documents no API, product or feature called "Offer Sheet", "OfferSheet" or "Offer Sheet API"; I found none on any Apple page read. The real objects with a "sheet" or an offer surface:

| Real name | What it is | Minimum OS | Who controls it |
|---|---|---|---|
| Win-back offer sheet (`Message.Reason.winBackOffer`) | System sheet shown to eligible lapsed subscribers when the app launches; suppress or delay with the `Message` API | iOS 18 | Apple decides eligibility and timing; the app can only delay or suppress |
| `AppStore.presentOfferCodeRedeemSheet(in:)`; `.offerCodeRedemption(...)` | Apple's sheet for redeeming an offer code in-app; the SwiftUI form returns a `VerificationResult` from iOS 27 | iOS 16 (UIKit); 27 for the new SwiftUI form | The app decides when to present it; Apple owns the sheet |
| `AppStore.showManageSubscriptions(in:)`; `.manageSubscriptionsSheet` | The same manage-subscription sheet as Settings, where the person cancels | iOS 15 | The app can open it; Apple owns everything after |
| `SubscriptionStoreView`, `SubscriptionOfferView`, `preferredSubscriptionOffer(_:)` | StoreKit views for merchandising, choosing which offer to show | 17, 26, 18 | The app |
| Retention message on the "Confirm Cancellation" page | Apple-owned message or offer after Cancel Subscription is tapped | iOS 15.1 | Apple shows it; the developer configures and gets it approved |

If the request meant "a native offer when someone removes the app", it is none of these (A3.1, A3.11).

### B5. Retention Messaging mechanics

| Item | Fact | Status |
|---|---|---|
| Timing | Shown after the person taps Cancel Subscription; the Confirm Cancellation page keeps a Cancel Subscription button and a Keep Subscription button (A2.1, A2.6b) | V |
| Message types (API) | Text; text with image; switch-plan (same subscription group only); promotional-offer (no image; the server signs the offer) | V |
| Defaults | "Only text-based messages, with or without images, can be default messages." "Promotional-offer and switch-plan retention messages aren't available as default messages." A default per product and locale is required, or no message shows (A2.4) | V |
| Real-time budget | 700 ms in production (A2.5); a sandbox performance test must pass before a production URL can be set; if the call fails, the default shows | V |
| Review | Uploaded messages go to Apple; "the system only displays images and messages to customers that are in an APPROVED state." Turnaround is not documented **[U]** | V |
| Limits | Apple's `Upload-Message` page: header at most 66 characters, body 144, image alt text 150, each bullet 66; "The maximum number of messages you can configure for each app is 2000." Adapty repeats 66 and 144 and adds "A product can have at most one default message and one promo message." | V (Apple) ; V (Adapty) |
| Editing | In Adapty, "If you edit a Live message, or add a new locale to it, the message instantly loses its live status, and becomes an In review message again." | V (vendor) |
| Fallback order | Real-time response first; if unavailable, the App Store Connect Retention Messaging preference "including any eligible offers"; then API defaults (WWDC26 309) | V |
| Measurement | Apple: report of page views, cancels and saves by save type ("Switch plan", "Redeem offer", "Don’t cancel"); "On request, data is available beginning from April 20, 2026." Adapty: Shown, Retained, Retention rate; it "can't see what happens on the Cancel Subscription screen" and infers saves from subscription events | V ; V |
| Not available in the US | The 12-month-commitment billing plan and its switch-plan option exclude the United States (A1.22) | V |
| What the app cannot do | See or change the message, delay or block the cancel, or learn that a message was shown; it learns afterward that auto-renew was turned off (A2.13, A2.15) | V ; latency U |

### B6. Signals the app or server can read about cancel and lapse

| Signal | Meaning | Latency / caveat |
|---|---|---|
| `RenewalInfo.willAutoRenew` (StoreKit) | Whether the subscription renews next period | Read when the app runs; whether `Status.updates` fires on the toggle is not documented **[U]** |
| `RenewalInfo.eligibleWinBackOfferIDs` | Offers the person can redeem, best first; empty in billing retry or grace | iOS 18+ |
| App Store Server Notifications V2 `DID_CHANGE_RENEWAL_STATUS` (`AUTO_RENEW_DISABLED` / `AUTO_RENEW_ENABLED`) | Auto-renew toggled | "real-time" per Apple; retries after failure at 1, 12, 24, 48 and 72 hours (App Store Server Notifications documentation); no delivery SLA **[U]** |
| `EXPIRED`, `DID_FAIL_TO_RENEW`, `GRACE_PERIOD_EXPIRED`, `OFFER_REDEEMED`, `REFUND` | Lapse, billing failure, offer redeemed, refund | Same |
| Adapty webhook events `subscription_renewal_cancelled`, `trial_renewal_cancelled`, `subscription_expired`, `trial_expired`, `subscription_renewal_reactivated`, `billing_issue_detected`, `entered_grace_period` | The same states, delivered by Adapty | V\* (Adapty docs). ExcerLock's server mirrors only the `premium` `access_level_updated` event and stores no renewal-off or offer field (`server/src/packages/subscriptions/lib/service.ts:33-38`) [R] |

## Appendix C. Repo, App Store Connect and Adapty observations [R]

Everything here is what I read, not what Apple or a vendor says. Repo references are to commit `eacebbe8`, this worktree's HEAD when I read it; line numbers were re-checked on 2026-09-28 and will drift. A path that starts with a package folder (`subscription/`, `notifications/`, `paywall/`, `runtime/`, `settings/`, `onboarding/`, `identity/`, `preferences/` and so on) is under `app-next/src/packages/`; Appendix E uses the same shortening. No code, configuration, price or offer was changed.

### C1. Read-only App Store Connect and Adapty reads, 2026-09-28

Commands were list or view calls only (`asc status`, `asc subscriptions groups list`, `asc subscriptions list`, `asc subscriptions offers ... list`, `asc subscriptions pricing summary` and `price-points list`, `adapty placements list`, `paywalls list`, `segments list`). No customer data or credentials were read or printed.

| Item | Observation | Note |
|---|---|---|
| App version and build | App `6787265352`, version 1.0, build 12 (`VALID`). Version state `REJECTED`. Review submission `0370ab0e-9af6-4866-ac52-edb15c693f68` state `UNRESOLVED_ISSUES`, submitted 2026-09-26 03:51 UTC. `asc status` health "red". Re-read 2026-09-28: `asc review history` outcome `rejected`, with 1 item rejected (the app version) and 3 `READY_FOR_REVIEW` (Annual, Monthly, the subscription group); the four earlier submissions read `COMPLETE` with items removed (the release record says the 2026-09-24 one was cancelled by the owner). `asc review items list` and `asc review doctor` return states only | The rejection reason is not readable through any call I ran **[U]**; `asc review doctor` says to resolve it in App Store Connect |
| Subscription groups | Three: `ExcerLock Premium` (`22372981`, 45 grid SKUs), `ExcerLock Premium — Variant A` (`22279282`, launch products), `ExcerLock Premium — Variant B` (`22279120`) | `docs/subscriptions.md:3` says "All 45 products live in one subscription group", which is true of the grid only |
| Launch products (Variant A) | `premium.a.annual` $59.99, proceeds $42.00 in year 1 and $50.99 after; `premium.a.monthly` $9.99, $7.00 and $8.49. Both `READY_TO_SUBMIT` at this read (an earlier read the same day reported `WAITING_FOR_REVIEW`); not approved. Each has a one-week free trial in 175 territories | Win-back offers need an App Review-approved subscription (A1.9) |
| Standalone discount SKUs | `a.winback.annual` $29.99 ($21.00 / $25.49); `b.winback.annual` $39.99 ($28.00 / $33.99). Both `MISSING_METADATA` | Ordinary products in the same groups as their plans; not Apple win-back offers |
| Variant B | `b.annual` $79.99 ($56.00 / $67.99); `b.monthly` $12.99 ($9.10 / $11.04). Both `MISSING_METADATA` | A higher-priced arm in its own group; not sellable today. Plan section 6 reads price candidates against the $59.99 launch price |
| Price grid | 45 SKUs; annual points $29.99, $34.99, $39.99, $44.99, $49.99 (none at $59.99 or $24.99); each with no trial, 3 days or 7 days; all `MISSING_METADATA` for lack of a review screenshot (`docs/subscriptions.md:94-99`) | Grid SKUs are not sellable today |
| Offers | Promotional 0, offer codes 0, win-back 0 on both launch products; introductory: 175 of 175 territories, one week, free trial | |
| US price points (annual product, US storefront) | $24.99: $17.50 / $21.24. $29.99: $21.00 / $25.49. $34.99: $24.50 / $29.74. $39.99: $28.00 / $33.99. $44.99: $31.50 / $38.24. $49.99: $35.00 / $42.49. $59.99: $42.00 / $50.99 (year 1 / after one year of paid service). 800 US price points listed | Proceeds are exactly 70% and 85% of the price, so the US price behaves as tax-exclusive (A1.18) |
| Sales territory | US only (`docs/subscriptions.md:7`) | Supports assuming USD |
| Retention Messaging API access | `asc storekit retention-messaging ...` fails with "default StoreKit credentials not found". Not investigated further | Says nothing about Apple's access decision |
| Adapty | App `9b8a6cf2-…`: three active placements (`in_app`, `onboarding`, `winback`); four paywalls (Premium A, Win-back A, Premium B, Win-back B); no segments listed. Bundled fallback (exported 2026-09-17): every product `introductory_offer_eligibility: true`, `promotional_offer_eligibility: false`, null `promotional_offer_id` and `win_back_offer_id` | Offers attached to products in the dashboard, and whether the In-App Purchase key is uploaded, were not visible through the CLI **[U]** |

### C2. Code and documentation observations

| # | Observation | Location | Bearing on the plan |
|---|---|---|---|
| 1 | The paywall footer shows "No payment due now" only when a free-trial label exists, then plan cards, then a button labelled "Start for free" or "Continue". No renewal sentence and no Terms or Privacy links | `app-next/src/packages/paywall/lib/PaywallScreen.tsx:155-179` | Discount offers widen the disclosure gap (plan section 1, item 5) |
| 2 | The visible plan price is per month (`localizedMonthlyPrice`), even for the annual plan; the billed amount appears only in the accessibility label `planRowTitle(product)` | `paywall/lib/PaywallScreen.tsx:222-224, 227, 245-247`; `subscription/lib/monthlyPrice.ts`; `subscription/subscriptionCopy.ts` | Apple: the billed amount "must be the most prominent pricing element" (A1.17) |
| 3 | `subscriptionCopy.terms` ("Subscriptions renew automatically unless canceled. Manage or cancel your subscription in your App Store account.") exists and is not rendered by the paywall | `subscription/subscriptionCopy.ts:52-53` | A ready sentence to reuse |
| 4 | Terms and Privacy links exist only under Settings > Legal. The onboarding welcome strings for them are defined and never rendered | `settings/LegalHubScreen.tsx:9-10`; `settings/lib/legalCopy.ts:2-3`; `onboarding/lib/welcomeCopy.ts:13-17` | Schedule 2 §3.8(b): links "must be accessible within Your Licensed Application" (A4.9) |
| 5 | Commit `5ae8aa06` (2026-09-24) removed `priceFirstFooterLabel` and the paywall's Terms and Privacy links. A prior audit had added them because "sourced rejections cite promoting the free trial more conspicuously than the billed amount" | `git show 5ae8aa06`; `docs/asc/review-fixes-changelog.md:13-21` | If Build 12's rejection cites 3.1.2, this is a candidate cause. Unverified until the reason is read |
| 6 | The repo's own ship checklist says the paywall must show "price, renewal terms, tappable Terms of Use (EULA) and Privacy Policy" | `plans/ship/05-review-readiness.md:21`; `plans/ship/README.md:53` | Same |
| 7 | `mapProduct` reads only a `free_trial` phase and never the offer type or paid phases; a paid intro, promotional or win-back offer gets no label and shows the base price with "Continue"; a free promotional or win-back period would be labelled "trial" | `subscription/AdaptySubscriptionAdapter.ts:260-281` (the `find` is at 268, `offerLabel` at 278) | Any paid offer needs offer-aware mapping before it ships (plan Phase 1) |
| 8 | Status is `trial` only when `activeIntroductoryOfferType === 'free_trial'`; anything else active is `active`, so a promotional or win-back free period gets no trial reminder | `subscription/lib/entitlementMapping.ts:35-37`; `notifications/notificationPlan.ts:5-10` | Reminder logic and offer logic interact |
| 9 | `makePurchase(product)` takes no offer argument; the offer is whatever Adapty resolved when the paywall was fetched | `subscription/AdaptySubscriptionAdapter.ts:174` | An offer is chosen at fetch time, so eligibility and copy must be read there |
| 10 | "Win-back" today is the Adapty `winback` placement, opened once per session when status is `expired`; in-session lapses push `/paywall` once | `subscription/useLapsedWinbackOffer.ts:7-23`; `paywall/PaywallSlot.tsx:17`; `launch/RootNavigator.tsx:22-31`; `ports/SubscriptionPort.ts:19` (closed placement union) | An Apple win-back offer would bypass this path (Appendix B2) |
| 11 | Local notification ids: `trial_ending`, `open_to_unlock`, `shield_open`. The trial reminder fires two days before `accessExpiresAt`: "Your trial ends in two days" | `notifications/notificationPlan.ts:2, 5-10` | The only shipped consent-covered touch |
| 12 | Scheduling runs only when permission is `granted`; refresh on app foreground | `runtime/lib/NativeRuntimeEffects.tsx:85-88, 103-105` | Cancel-on-foreground exists today for `trial_ending` |
| 13 | The foreground handler shows banner, list and sound for every notification | `runtime/lib/NativeRuntimeEffects.tsx:13-20` | A promotional touch could banner over the paywall |
| 14 | Permission is requested once, at onboarding step `S3d`, on a screen titled "We'll send you a reminder before your trial ends"; the request asks for alert and sound, not provisional | `onboarding/OnboardingRoute.tsx:44-49`; `conditions/planCopy.ts:23`; `notifications/ExpoLocalNotifications.ts:9`; `.agents/skills/verify-excerlock/references/features/onboarding.md:39` | Consent scope is the trial reminder |
| 15 | Local requests use a DATE trigger; there is no first-launch marker and no Keychain anchor beyond the auth session | `notifications/ExpoLocalNotifications.ts:20`; `identity/lib/secureStorage.ts:8` | No "after download" anchor (Appendix E) |
| 16 | `open_to_unlock` is scheduled only when `notificationsEnabled` is true; its text is "Your walking goal is complete" | `runtime/lib/createRealRuntime.ts:442-443`; `notifications/notificationPlan.ts:11-14` | Keep offer copy free of such Condition details |
| 17 | `notificationsEnabled` and `analyticsEnabled` default to `true` | `preferences/settingsStore.ts:16` | See discrepancies below |
| 18 | `UIBackgroundModes` is `["location", "fetch"]`; the push entitlement is present by design (B50) with no token registration | `app-next/config/native.ts:18-21, 126`; `plans/ship/T12-notifications.md:10` | Remote push or silent push needs a new binary |
| 19 | `openSubscriptionManagement` opens `https://apps.apple.com/account/subscriptions` | `runtime/lib/createIdentityServices.ts:43` | No in-app manage sheet call |
| 20 | The server mirrors only the `premium` `access_level_updated` event and keeps no renewal-off, offer, price or transaction field | `server/src/packages/subscriptions/lib/service.ts:33-38`; `server/src/packages/subscriptions/README.md:5-7` | Cancel-intent signals would need a new server field, and the privacy stance argues against it |
| 21 | Ten subscription events are declared Adapty-owned: trial started, converted, renewal cancelled, subscription started, renewed, renewal cancelled, expired, refunded, billing issue, grace | `packages/analytics-events/src/events/subscription.ts:3-14` | Purchase analytics stay in Adapty |
| 22 | Review notes: "Notifications: trial reminder only." and "No location, steps or app selections are sent to our servers." | `docs/asc/review-notes.md:24-25` | New notifications or offers must be described there (guideline 2.3.1(a)) |
| 23 | An OTA may carry only what the reviewed binary already contains; "A new PostHog flag, or any new consumer of the existing flag rail" is new-submission material | `docs/ota.md:73-91` | Kill switches and new consumers need a binary |
| 24 | PostHog owns non-monetary experiments, Adapty owns money decisions | `docs/adr/0032-posthog-flag-consumers.md` | Price tests run in Adapty |
| 25 | After setup `/paywall` is a dismissible modal; a lapse presents it once; the onboarding paywall is a non-dismissible gate until setup is complete | `docs/adr/0024-keep-account-access-after-subscription-lapse.md` | Offers must not trap a lapsed person |
| 26 | Sign-in and each Condition's permissions follow the paywall; notifications are not part of that flow | `docs/adr/0043-sign-in-and-permissions-after-the-paywall.md` | |
| 27 | Settings has one general Notifications switch (`notificationsEnabled && permission granted`); turning it on requests permission or opens iOS Settings. In code it gates only `open_to_unlock`; `trial_ending` scheduling checks permission alone, and `shield_open` is enqueued by the ShieldAction extension without reading the setting. Erasing production data cancels all three ids | `settings/SettingsScreen.tsx:19-30`; `runtime/lib/createRealRuntime.ts:180-182, 442`; `runtime/lib/NativeRuntimeEffects.tsx:85-88`; `app-next/targets/ShieldAction/ShieldDeepLinkNotification.swift:14` | Not a marketing consent. A promotional-reminder choice must be separate from it (plan section 5) |

### C3. Places where documents and code disagree

| Topic | Document says | Code or state says |
|---|---|---|
| Notification defaults | PRD §3.14: "radical minimalism — the app ships silent." and "Every notification type defaults OFF" (`excerlock-app-prd.md:230`) | `notificationsEnabled: true` (`preferences/settingsStore.ts:16`) |
| When to ask | PRD §3.14, "Permission ask": "never during onboarding" (`:239`), with the trial-end reminder deferred to "the onboarding/paywall grill" | The ask is on onboarding step `S3d` |
| Promotional pushes | PRD §3.14: "no promotional pushes" (`:238`) | None exist today; the nine-touch idea would contradict it |
| Which notifications exist | Review notes: "Notifications: trial reminder only." | Code also defines `open_to_unlock` and `shield_open` (`notifications/notificationPlan.ts:2`) |
| Analytics consent | Taxonomy: "Events are emitted only after explicit opt-in" (`docs/analytics/taxonomy.md:3`) | `analyticsEnabled: true` by default |
| Entitlement vocabulary | `CONTEXT.md`: "`trial`, `active`, or `none`" | The type also has `unknown`, `expired`, `billingIssue` (`model/types.ts:63-64`) |
| Push entitlement | PRD line 477 says to strip `aps-environment` | Manifest row 15 and `app-next/config/native.ts:18-21` keep it (B50) |
| Background modes | Manifest row 13: `[location, fetch, processing]` (`plans/ship/02-native-manifest.md:22`) | `["location", "fetch"]` (`app-next/config/native.ts:126`) |
| Paywall footer | `docs/asc/review-fixes-changelog.md:17` describes a price-first footer and Terms and Privacy links | Removed in `5ae8aa06`; absent at HEAD |
| Group count | `docs/subscriptions.md:3`: one group | Three groups (C1) |

None of these changes a recommendation. Each is a reason to reconcile the documents before a reviewer or counsel reads them.

### C4. Not read or not verifiable from here

- The Build 12 rejection text; the live Adapty offer attachments and In-App Purchase key; Apple's decision on the Retention Messaging API interest form; whether `expo-application` is linked into Build 12 (`expo-notifications` depends on it; nothing in `app-next/src` imports it); whether Build 12's entitlements carry the production `aps-environment` (repo documents only).
- Whether any rows in `docs/adr` beyond 0024, 0032 and 0043 bear on this plan. I did not read them all.

## Appendix D. Economics

Everything here is arithmetic on Apple's published rules and on the proceeds App Store Connect lists for ExcerLock's own price points. **Conversion, uptake, renewal and refund rates are the owner's inputs; Apple and this report supply none.** I invented no lift and no optimum. The baseline conversion rates in the sample-size grids are an illustrative grid, not ExcerLock data.

### D1. Commission, tax and proceeds

| Topic | What Apple says | Status |
|---|---|---|
| Standard rate | "For sales of Licensed Applications to End-Users, Apple shall be entitled to a commission equal to thirty percent (30%) of all prices payable by each End-User." | V (Schedule 2 §3.4(a), v126) |
| After a year of paid service | 15% on renewals after "greater than one year of paid subscription service within a Subscription Group" (A1.21). Apple's marketing page words it as 70% in year 1, 85% after (A1.18). The exact day the rate changes is unverified ("greater than one year" versus "accumulates one year") | V ; U |
| Gap that keeps tenure | "Retention Grace Period refers to the time period between the end of a customer's subscription (e.g., due to cancelation or non-payment) and the beginning of a new subscription within the same Subscription Group, provided that such time period is no greater than 60 days, subject to change." | V (Schedule 2 §3.4(a)) |
| Resubscribing | "if the subscription is recovered after 60 days, the rate reverts to 70% and the day count starts over." | V (ASC Help, Offer auto-renewable subscriptions) |
| Which offer time counts | Subscriptions page: "Days of paid service include all subscription offer types (introductory, promotional, and offer codes) with paid pricing options (pay as you go, pay up front). Free trials and renewal extensions are excluded from days of paid service." The ASC Help page says: "Time spent within a subscription offer is also counted toward the total." These two conflict on free trials. Win-back periods are not mentioned in either **[U]** | V ; V |
| Per group | "Days of paid service are specific to each subscription group." A move to another group resets them (A1.20). Changes of level inside one group do not | V |
| Small Business Program | "Existing developers who made up to 1 million USD in proceeds in the prior calendar year for all their apps, as well as developers new to the App Store, can qualify for the program and the reduced commission." Enrolled developers get 85% from day one (A1.19). "Your proceeds will be adjusted fifteen (15) days after the end of the fiscal calendar month in which your enrollment is approved." Threshold in the contract: "no more than $1,000,000 in total proceeds" in the prior year | V (Small Business Program page; Schedule 2 §3.4(b)) |
| Tax | Commission is computed on price "net of any and all taxes collected". Apple: "Prices advertised to customers in all countries except the U.S. and Canada include taxes". ExcerLock's US proceeds are exactly 70% and 85% of price (Appendix C1), so I treat the US tax deduction as zero | V ; R |
| Proceeds definition | "Proceeds are the amount you'll receive on sales of your apps and In-App Purchases. This is the Customer Price minus applicable taxes and Apple's commission, per Schedule 2 of your Paid Apps Agreement." Read proceeds per price point from App Store Connect, not price times a rate: year-1 values appear rounded up and year-2 values rounded to nearest | V ; R |
| Refunds | Contract §6.3: "In the event that Apple refunds any such price to an End-User, You shall reimburse, or grant Apple a credit for, an amount equal to the price for that Licensed Application." Apple's sample report rows show refunds as "negative values for Units and Customer Price, and positive values for Developer Proceeds", which suggests proceeds are reversed. Run both readings | V ; reading U |

### D2. Formulas (mine, not Apple's)

```
P    standard price per period          P_o  offer price per offer payment
R_i  proceeds per paid period i = P (1 - t)(1 - c_i);  US: t = 0; c_i = 0.30 in year 1, 0.15 after
     (take R_i from App Store Connect per price point; Small Business Program: c = 0.15 throughout)
p    chance an exposed user becomes a payer;  p_0 control, p_1 treatment
r_i  chance a payer of period i pays period i+1;  S_1 = 1, S_{i+1} = S_i r_i
u    uptake of the offer among exposed, eligible users
k    cannibalization: share of takers who would have paid P anyway
f    refund rate;  phi = variable fee share;  v = variable cost per paying user-period

V_0 = sum_i S_i^0 [ R_i(P)(1-f)(1-phi) - v ]                    value per payer, no offer
V_o = sum_(i<=n) S_i^o [ R_i(P_o)(1-f_o)(1-phi) - v ]           offer periods
    + sum_(i>n)  S_i^o [ R_i(P)(1-f)(1-phi) - v ]               then the standard price

Offer versus no offer, per exposed user:   Delta = u [ V_o - k V_0 ]
Cannibalization limit:                     k* = V_o / V_0        (worthwhile iff k < k*)
Break-even conversion multiple, arm 1 vs control:   p_1 / p_0 > m* = V_0 / V_1
Price only, same tenure, retention and refunds:      m* = P_0 / P_1 = R(P_0) / R(P_1)
Arc elasticity:                            e = ln(p_1/p_0) / ln(P_1/P_0)
Contribution per exposed user:             p x sum_i S_i [ R_i (1-f_i)(1-phi) - v ]
```

A free trial of n_f periods earns nothing and accrues no paid days, so the first paid term comes at period n_f + 1 at the 30% rate.

### D3. Break-even against the $59.99 annual

Linear proceeds mean a lower price wins only if conversion rises by the price ratio. Proceeds are the ASC-listed US values (Appendix C1).

| Annual price | Year-1 proceeds | Discount vs $59.99 | Conversion multiple to match year-1 proceeds | Cannibalization limit at equal retention (k*) |
|---|---|---|---|---|
| $49.99 | $35.00 | 16.7% | x1.20 | 83.3% |
| $44.99 | $31.50 | 25.0% | x1.33 | 75.0% |
| $39.99 | $28.00 | 33.3% | x1.50 | 66.7% |
| $34.99 | $24.50 | 41.7% | x1.71 | 58.3% |
| $29.99 | $21.00 | 50.0% | x2.00 | 50.0% |
| $24.99 | $17.50 | 58.3% | x2.40 | 41.7% |

Reading the last row: a $24.99 offer beats no offer only if fewer than 41.7% of takers would have paid $59.99 anyway, or if conversion rises by more than 2.40 times. If the offer payment earned 85% (only if paid offer time counts as tenure) the multiple would be 42.00 / 21.24 = 1.98 and k* = 50.6%. That reading is unverified for win-back and for promotional offers on a first-time payer **[U]**.

Annual versus monthly: $59.99 is 6.0 monthly $9.99 payments in year 1 ($42.00 / $7.00) and 6.006 in year 2 ($50.99 / $8.49).

**Two-year view.** If the discounted payer is worth less over time, the multiple rises. Break-even multiple over two years, with the $59.99 control retaining half its payers into year 2 (r = 0.5); the discounted plan's year-2 renewal rate varies. Arithmetic only:

| Discounted annual price | r_lo = 0.5 | r_lo = 0.4 | r_lo = 0.3 |
|---|---|---|---|
| $49.99 | x1.20 | x1.30 | x1.41 |
| $44.99 | x1.33 | x1.44 | x1.57 |
| $39.99 | x1.50 | x1.62 | x1.77 |
| $34.99 | x1.71 | x1.85 | x2.02 |
| $29.99 | x2.00 | x2.16 | x2.36 |
| $24.99 | x2.40 | x2.60 | x2.83 |

Per-payer two-year proceeds, by year-2 renewal rate r (the same r on every path, which flatters the discounted paths):

| r | Full $59.99 | Standalone $24.99 SKU (renews at $24.99) | Offer at $24.99, then $59.99 renewal at 85% | Same, at 70% |
|---|---|---|---|---|
| 0.3 | $57.30 | $23.87 | $32.80 | $30.10 |
| 0.5 | $67.50 | $28.12 | $43.00 | $38.50 |
| 0.7 | $77.69 | $32.37 | $53.19 | $46.90 |

A standalone $24.99 SKU renews at $24.99 for everyone who takes it, and is visible in Manage Subscriptions to every subscriber in its group. An offer on the standard product returns to $59.99, so it costs the first period only, but it also needs the person to accept a 2.4x price step in year 2, which is the least-known number in the table.

**Offer shapes on a monthly plan (arithmetic on Apple's own example).** Apple: "If you select Pay as you go, customers pay a discounted price for each billing period for a selected duration (for example, $1.99 per month for 3 months for a subscription with a standard price of $9.99)." and "If you select Pay up front, customers pay a one-time discounted price for a selected duration (for example, $1.99 for 2 months for a subscription with a standard price of $9.99)." At ExcerLock's $9.99 monthly (proceeds $7.00), a $1.99 month earns $1.39, so a discounted month needs about 5.0 times the payers to match a full-price month. A free period earns nothing, and the metric becomes trial-to-paid. On an annual product, pay as you go allows "1 Year" only; pay up front allows 1, 2, 3 or 6 months or 1 year; free trials run from 3 days to 1 year (Apple's introductory-offer table). Promotional and win-back duration sets for annual products are not tabulated in App Store Connect Help **[U]**; Apple's win-back announcement gives one example: "a pay up front offer for a reduced subscription price of $9.99 for six months, with a standard renewal price of $39.99 per year." [V\*].

### D4. Renewal behaviour, price changes and fairness

| Topic | Fact | Status |
|---|---|---|
| Return to normal price | Introductory: "All subscriptions renew at the regular price when the introductory period is over." Promotional: "Once the offer period concludes, a promotional offer auto-renews at the standard price." Offer codes renew to the standard price unless the code is free and set not to renew. Win-back: reverts to the standard price on Apple's example only | V ; V ; V ; V\* |
| Offer price versus regular price | Apple's wording is "discounted price". Whether an offer priced at or above the regular price is blocked is confirmed only by a forum post for pay as you go **[U]** | U |
| Lowering the standard price | "If you decrease the price of your auto-renewable subscription, existing subscriptions will automatically renew at the lower price. You don't have the option to preserve the higher price for existing subscribers." | V |
| Raising it | Existing subscribers can keep the old price. Consent is required if "The price increase is more than 50% of the current price and the difference in price exceeds approximately US$5 per period for non-annual subscriptions, or US$50 per year for annual subscriptions", if the region requires it, or if there was an increase "within the past 12 months". US thresholds: 5 and 50 | V |
| Offer-takers during a change | "Subscribers on introductory or promotional price subscriptions ... will renew for at least one more renewal period at the price that was displayed when they subscribed" | V |
| One scheduled change | "You can schedule one future price change at a time, per storefront, per billing plan type." "Once a price increase goes into effect, it can't be reversed." | V |
| Apple's warning about early discounts | "providing discounts as soon as your customer's subscription ends may lead to unintended behavior, as users may cancel their plans in order to receive discounts" (A1.14). A trial-ended person is closer to this cohort than to a long-lapsed one | V |

Fairness reading [H]: a person who paid $59.99 and later sees a $24.99 offer for lapsed users may feel penalised for staying. The mitigations available inside Apple's model are the wait between win-back offers, the minimum paid duration, deeper discounts only for longer lapses, and never offering below the ladder's floor to someone currently paying. Whether that trade is acceptable is a product decision, question 7 in the plan.

### D5. Sample size and minimum detectable effect

Two-sided alpha 0.05, power 0.80, exact two-proportion test, independent users, fixed horizon. Lehr's approximation `n ≈ 16 p̄(1−p̄) / δ²` agrees with the exact figures to within about 2%. Expected conversions per arm should be at least 10.

**n per arm needed to detect a relative lift, by baseline conversion:**

| Baseline | +10% | +20% | +25% | +30% | +50% | +100% |
|---|---|---|---|---|---|---|
| 1% | 163,095 | 42,693 | 27,937 | 19,827 | 7,750 | 2,319 |
| 2% | 80,682 | 21,109 | 13,809 | 9,798 | 3,826 | 1,141 |
| 3% | 53,211 | 13,914 | 9,100 | 6,455 | 2,518 | 749 |
| 4% | 39,475 | 10,317 | 6,745 | 4,783 | 1,863 | 553 |
| 5% | 31,234 | 8,158 | 5,333 | 3,780 | 1,471 | 435 |
| 6% | 25,740 | 6,719 | 4,391 | 3,112 | 1,209 | 356 |
| 8% | 18,872 | 4,921 | 3,213 | 2,276 | 882 | 258 |
| 10% | 14,751 | 3,841 | 2,507 | 1,774 | 686 | 199 |

**Smallest relative lift detectable, by n per arm:**

| Baseline | 250 | 500 | 1,000 | 2,500 | 5,000 | 10,000 | 25,000 |
|---|---|---|---|---|---|---|---|
| 2% | 262.5% | 166.2% | 108.2% | 63.4% | 43.1% | 29.7% | 18.3% |
| 4% | 162.0% | 106.1% | 70.9% | 42.6% | 29.3% | 20.3% | 12.6% |
| 5% | 139.3% | 92.1% | 62.0% | 37.4% | 25.9% | 18.0% | 11.2% |
| 6% | 123.3% | 82.1% | 55.5% | 33.7% | 23.3% | 16.3% | 10.2% |
| 10% | 87.7% | 59.5% | 40.7% | 25.0% | 17.4% | 12.2% | 7.6% |

**Several challengers against one control (alpha divided by the number of comparisons), 5% baseline, +30% lift:** 1 comparison 3,780 per arm; 2 comparisons 4,578; 3: 5,042; 4: 5,371; 6: 5,832. Testing all 45 grid cells at once would need roughly 170,000 exposures before any correction.

**What it means for a price test.** The null in a price test is break-even revenue, not equal conversion: under it, p_1 = m* x p_0, so the conversion tables above (which test a difference from the control) do not size it. Size it on revenue per exposed user, `n per arm ≈ (z_(α/2) + z_β)² (σ_0² + σ_1²) / D²`, where σ_j² = R_j² p_j (1 − p_j) and D is the smallest difference in dollars per exposed user worth acting on. Worked arithmetic with placeholder numbers, not ExcerLock data: control at $59.99 converting 5% earns 0.05 x $42.00 = $2.10 per exposed user; a $34.99 arm breaks even at 8.57% (x1.71). If that arm actually converted 20% above break-even (10.29%) it would earn $2.52, D = $0.42, and detecting it at 80% power needs about 6,200 exposed users per arm. At +10% above break-even the figure is about 24,000 per arm, at +30% about 2,800. A test sized for a +20% conversion lift over the control therefore cannot show that a large discount is profitable, and cannot rule out that it loses money.

### D6. Staged price test (conditional; no lift or optimum assumed)

| Stage | What | Exit rule |
|---|---|---|
| 0. No exposure | Read ASC proceeds for every candidate; compute m* for every pair; freeze the primary metric, alpha, power, and a fixed-n stopping rule; emit paywall view, trial start, purchase, refund and arm-id events with no health, location, step, gym or Screen Time detail; check n required against the traffic you can get, and merge or drop arms if traffic falls short | Do not start an underpowered test |
| 1. Screen | At most three arms: control plus one or two widely spaced prices. Primary metric: contribution per exposed user at day 8 (trial start plus day-7 conversion). Secondary: trial start rate, trial-to-paid, refund within the window | No peeking; stop at planned n |
| 2. Narrow | At most two more arms, only where the order is unresolved; interpolate with the arc elasticity; apply the multiplicity correction | |
| 3. Confirm | Run the winner against the previous price; add day-30 auto-renew-off and refund reads. Year-2 renewal is unobservable for at least 12 months for an annual plan, so carry it as a parameter using the two-year table above | |

Constraints specific to this account:

- **One group per person.** Apple's stated best practice is a single group [V]. In one group every SKU is visible in Manage Subscriptions, so an arm on a cheaper SKU is visible to the others. In separate groups the trial and the tenure clock are per group, and a person can be billed in two (A1.20). Today the launch products, Variant B and the grid sit in three groups, and the grid has neither $59.99 nor $24.99.
- **Adapty A/B.** Needs at least two paywalls; "Once a test is live, it cannot be changed." (the Modify option duplicates it and stops the original); "Stopping an A/B test is irreversible — the test cannot be restarted." Results are reported as "revenue, probability to be best (P2BB), and revenue per 1K users". Regular tests reach existing users who have seen an Adapty paywall. The app already calls `logShowFlow`, which Adapty requires for correct conversion stats [R, V].
- **Truth source.** Proceeds truth is App Store Connect; its Sales and Trends dashboard "shows near-real-time estimates, while downloaded reports contain finalized data", Apple's analytics reports omit "rows with data from fewer than five users or five unique devices" [V\*], and "Data for a given day is considered complete two days after the reporting date." [V\*] Use Adapty or PostHog events for the primary metric and ASC for proceeds.
- **Sandbox and TestFlight cannot validate tenure economics.** Sandbox renews a month in 5 minutes and stops after 12 renewals; TestFlight "renewed daily, up to 6 times within a 1-week period". The 85% step and the 60-day reset cannot be observed there.

### D7. Conditional price bands (no recommended price)

The bands below are decision rules for the owner to fill with measured numbers, not results.

| If the measured conversion ratio p_lo / p_hi is | then, for first-period contribution |
|---|---|
| above the break-even multiple in D3 for that pair | the lower price wins |
| below it | the higher price wins |
| in between, within the confidence interval | the test is inconclusive; do not ship on it |

For two-year value the required ratio also depends on relative renewal (second table in D3). The existing $59.99 launch products sit in the Variant A group, while the grid's $49.99 and $39.99 annual prices sit in the `ExcerLock Premium` group, so a first test between them would have two introductory-offer clocks and two tenure clocks. Apple says people "see all renewal options and subscription groups" in Manage Subscriptions. Adapty's assignment keeps a person on one arm in normal use, but a reinstall with a new profile or a visit to Manage Subscriptions can cross arms. Which single group should hold both arms is question 6 for the Account Holder; the alternative is to test only among grid prices, which excludes the launch price.

Ranges in the wild are proxies, not benchmarks for this app: vendor case studies report price changes with no significance data (Appendix G).

## Appendix E. Notification platform semantics

What iOS, Expo and Apple's rules allow for timed messages. Apple text was read on 2026-09-28. SDK headers are from the installed Xcode 26.4 SDK (`iPhoneOS26.4.sdk/System/Library/Frameworks/UserNotifications.framework/Headers`). Expo source is `expo-notifications` 57.0.21 under `node_modules/`. Repo paths under `app-next/src/packages/` are shortened as in Appendix C. "Not found" means I looked and found no Apple statement, which is not evidence that none exists.

**Sources, all read 2026-09-28.** [`AppTransaction`](https://developer.apple.com/documentation/storekit/apptransaction), [`originalPurchaseDate`](https://developer.apple.com/documentation/storekit/apptransaction/originalpurchasedate), [`appTransactionID`](https://developer.apple.com/documentation/storekit/apptransaction/apptransactionid), [`AppTransaction.shared`](https://developer.apple.com/documentation/storekit/apptransaction/shared), [About the app launch sequence](https://developer.apple.com/documentation/uikit/about-the-app-launch-sequence), [`authorizationStatus`](https://developer.apple.com/documentation/usernotifications/unnotificationsettings/authorizationstatus), [Asking permission to use notifications](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications), [`UILocalNotification`](https://developer.apple.com/documentation/uikit/uilocalnotification) (deprecated), the archived [Scheduling and Handling Local Notifications](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/SchedulingandHandlingLocalNotifications.html), [Modifying content in newly delivered notifications](https://developer.apple.com/documentation/usernotifications/modifying-content-in-newly-delivered-notifications), [Registering your app with APNs](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns), [`registerForRemoteNotifications()`](https://developer.apple.com/documentation/uikit/uiapplication/registerforremotenotifications()), [Sending notification requests to APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns), [Handling notification responses from APNs](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns), [Pushing background updates to your app](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app), [`Transaction.updates`](https://developer.apple.com/documentation/storekit/transaction/updates), [Responding to App Store Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications/responding-to-app-store-server-notifications), [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [HIG: managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications). The Apple Developer Forums threads cited (36442, 747482, 772031, 772357) are at `developer.apple.com/forums/thread/<number>`.

### E1. "Download" versus first launch

| Question | Finding | Status |
|---|---|---|
| Is there an Apple timestamp for download? | `AppTransaction.originalPurchaseDate`: "The date the customer originally purchased the app from the App Store." It "remains the same, even if the customer deletes and reinstalls the app." `appTransactionID` "remains the same for the same Apple Account and app if the customer redownloads the app on any device" and "is available even if a customer makes no Apple In-App Purchases." | V |
| Can it be tested? | "In the sandbox testing environment, the original purchase date is always 2013-08-01 12 AM PDT". An Apple DTS engineer: "TestFlight uses the sandbox for in-app purchases." (forum thread 772357, Feb 2025, about `originalAppVersion`). That TestFlight therefore shows the 2013 date is my inference, not an Apple statement | V ; V\* ; U |
| When can the app read it? | `AppTransaction.shared` returns the signed record "including the first time the app launches"; it "throws an error if the AppTransaction isn't available or if the user isn't authenticated with the App Store" and "may require network connectivity". It needs new native code: no app-owned Swift module, target or JavaScript source references `AppTransaction`, and neither do the installed `react-native-adapty` and `@adapty` packages. The native Adapty iOS SDK is a CocoaPod that is not in this worktree; whether it uses `AppTransaction` internally was not checked | V ; R ; U |
| Does any app code run between download and first launch? | Not found. The launch-sequence page says prewarming "creates your process and loads the libraries your app links against, then suspends your process without allowing any application code to run", which concerns prewarming, not installation. I found no Apple statement about an install hook either way | V (prewarming) ; U (install) |
| Does the repo store a first-launch time? | No. The only app-owned Keychain (SecureStore) use I found is the auth session (`identity/lib/secureStorage.ts:8`, `identity/createAuthServices.ts`). `expo-application` reports an install time derived from the creation date of the Documents directory (`node_modules/expo-application/ios/ApplicationModule.swift:30-45`); it is a dependency of `expo-notifications` (`node_modules/expo-notifications/package.json:39`), nothing under `app-next/src` imports it, and whether it is linked into Build 12 is unverified. SDKs such as Adapty may keep their own identifiers; not checked | R ; U |
| Does the Keychain survive deletion? | Undocumented. An Apple engineer's forum answer (thread 36442, date not retained): "All versions of iOS prior to 10.3 beta preserve keychain items when an app is deleted. IMPORTANT This was most definitely an implementation detail… Our keychain documentation has never specified what would happen in this case." | V\* |

Conclusion: the earliest anchor an app can use with JavaScript alone is its own first launch, and it must store that marker itself. Anything phrased "after download" must say "after first launch" in copy, analytics and this plan. An AppTransaction-based anchor needs a new binary and can predate first launch, because someone can download and open the app days later.

### E2. Local notification delivery, caps and time zones

| Topic | Finding | Status |
|---|---|---|
| Trigger types | Time-interval and calendar triggers exist in `UNNotificationTrigger.h`. Expo maps a JavaScript `DATE` trigger on iOS to `UNTimeIntervalNotificationTrigger(timeInterval: date.timeIntervalSinceNow, repeats: false)` (`node_modules/expo-notifications/ios/ExpoNotifications/Notifications/TriggerRecords.swift:107`), so it becomes an elapsed-time trigger fixed at scheduling time. Calendar triggers accept an optional time zone (`:56-57`). The app uses `DATE` (`notifications/ExpoLocalNotifications.ts:20`) | V (source) ; R |
| App closed | "Local notifications give you a way to alert the user at times when your app might not be running." | V (archived guide) |
| Cap | The only published number is on the deprecated `UILocalNotification` page: "An app can have only a limited number of scheduled notifications; the system keeps the soonest-firing 64 notifications (with automatically rescheduled notifications counting as a single notification) and discards the rest." The current header says only: "The number of pending notification requests that may be scheduled by an application at any one time is limited by the system." Expo's page states no cap. Nine touches plus the app's three ids are far below 64 | V |
| Same id | "Calling -addNotificationRequest: will replace an existing notification request with the same identifier." | V (header) |
| Foreground only | "The method will be called on the delegate only if the application is in the foreground. If the method is not implemented or the handler is not called in a timely manner then the notification will not be presented." When the app is not running, "the system alerts the user according to the information in the notification itself." A scheduled local notification therefore cannot be suppressed or edited at delivery unless the app is in the foreground | V |
| Service extension | It "modifies the content of a remote notification before it's delivered"; it does not apply to local notifications | V |
| Denied | "When the value of the property is denied, the system doesn't deliver notifications to your app, and the system ignores any attempts to schedule local notifications." The repo cancels the id and throws "Notifications are disabled in Settings" (`notifications/lib/LocalNotifications.ts:18-21`) | V ; R |
| After update, delete, reinstall, reboot, force-quit | No Apple text found. An Apple engineer on the forums: "Scheduled local notifications will persist after an app update as long as you have not changed the app's bundle id." (thread 772031, Jan 2025), disputed by another poster; nothing found about deletion, reinstall, reboot or force-quit | V\* ; U |
| Calendar time zone and DST | No Apple text found on the trigger pages read; two forum threads that might cover it (811265, 708732) returned a bot-verification page and were not read. A `DATE` trigger is fixed elapsed time, so "09:00 local" is not preserved if the person changes time zone or crosses a DST change between scheduling and firing | U ; R |
| Foreground display in this app | The handler always shows banner, list and sound (`runtime/lib/NativeRuntimeEffects.tsx:13-20`), so a touch would banner over the paywall unless the handler is changed | R |

### E3. Authorization, consent and opt-out

| Topic | Finding | Status |
|---|---|---|
| One ask | "The first time your app makes this authorization request, the system prompts the person to grant or deny the request and records that response. Subsequent authorization requests don't prompt the person." Apple prefers asking in context | V |
| Provisional | "The system delivers provisional notifications quietly — they don't interrupt the person with a sound or banner, or appear on the lock screen. Instead, they only appear in the notification center's history." The app requests alert and sound, not provisional (`notifications/ExpoLocalNotifications.ts:9`), and treats a provisional grant as granted (`:11`). Expo's `PROVISIONAL` status is `3` | V ; R |
| Consent for marketing | HIG: "Don't use notifications to send marketing or promotional content unless people explicitly agree to receive such information." Apple's own example is "an offer to become a subscriber". The consent must be a separate interface: "Create an alert, modal view, or other interface that describes the types of information you want to send and gives people a clear way to opt in or out." Plus "an in-app settings screen that lets people change their choice" | V |
| Guideline | 4.5.4: promotional Push Notifications only where "customers have explicitly opted in" "via consent language displayed in your app's UI", with "a method in your app for a user to opt out" (A4.2). The guideline text says Push Notifications, not local | V |
| Contract | DPLA Attachment 1 §2.2 applies the same opt-in and opt-out rule to "the APN or Local Notifications" (A4.3). §2.3: the developer may not "unduly burden an Apple-branded product or an end user with excessive Push Notifications or Local Notifications, as may be determined by Apple in its reasonable discretion" (A4.4) | V |
| Repeats | HIG: "Avoid sending multiple notifications for the same thing, even if someone hasn't responded." | V |
| Interruption level | HIG: "Never use the Time Sensitive interruption level to send a marketing notification." Expo's type is `'passive' \| 'active' \| 'timeSensitive' \| 'critical'` (`node_modules/expo-notifications/build/Notifications.types.d.ts:407`), so nothing in the JavaScript API prevents a Time Sensitive touch: a rule and a code review must. The app sets no level today (default), and Expo wires the field into the request content (`node_modules/expo-notifications/ios/ExpoNotifications/Notifications/NotificationRecords.swift:384-385`) | V ; R |
| Privacy label | The App Privacy Details page's purposes table defines "Developer's Advertising or Marketing" as "Such as displaying first-party ads in your app, sending marketing communications directly to your users, or sharing data with entities who will display your ads". The page never mentions push tokens, so whether an APNs token counts as a "Device ID" is unresolved | V ; U |
| What consent exists today | A single system prompt on the onboarding step titled "We'll send you a reminder before your trial ends" (Appendix C2 row 14). That is consent to a trial reminder, and the plan treats it as nothing more | R |

### E4. Multi-device, entitlement freshness and recalling scheduled touches

- **Each device holds its own pending requests.** Local scheduling is an on-device API; I found no Apple text on syncing pending requests across devices [U]. Someone with two devices gets two independent sets.
- **The app learns of a purchase made elsewhere only while it runs.** `Transaction.updates` is for "new transactions while the app is running" and "also emits transactions that customers complete in your app on another device" (V\*). The app re-checks on foreground (`runtime/lib/NativeRuntimeEffects.tsx:103-105`) and listens to Adapty's `onLatestProfileLoad` (`subscription/AdaptySubscriptionAdapter.ts:58-63`). Adapty's docs say the SDK "periodically queries the server every minute to check for any updates" (V\*, read through a fetch-tool summary).
- **A closed app cannot recall a scheduled touch.** A person who buys on an iPad while the phone is closed still gets the phone's remaining touches. Only server-sent pushes can reach a closed app, and silent pushes cannot be relied on (E5).
- **Server-side entitlement feed.** App Store Server Notifications V2 is a "real-time" service; on failure "it retries five times, at 1, 12, 24, 48, and 72 hours after the previous attempt." ExcerLock's server mirrors only the premium access level from Adapty and keeps no renewal, offer or transaction field (Appendix C2 row 20).

### E5. Remote push, uninstall detection and silent push

| Topic | Finding | Status |
|---|---|---|
| Token without permission | "If you do not request and receive authorization for your app's interactions, the system delivers all remote notifications to your app silently." The shipped Expo module can request a token from JavaScript (`node_modules/expo-notifications/ios/ExpoNotifications/PushToken/PushTokenModule.swift:44`), while the repo's ship plan says "no token registration, no remote notification code path (B50)" and lists a "no push registration (grep guard)" test (`plans/ship/T12-notifications.md:10, 15`). I found no such rule in `tools/excer/checks`, `packages/eslint-plugin-excerlock` or `app-next/eslint.config.js`, and the repo has no test files (`ARCHITECTURE.md` rule 7); I did not run `./excer check` | V\* ; R |
| Tokens | "You register your app and receive your device token each time your app launches"; "Because a user can have multiple devices, prepare your app to handle multiple device tokens." Token-based APNs auth needs a `.p8` key: "Refresh your token no more than once every 20 minutes and no less than once every 60 minutes." | V\* |
| APNs limits | "limited to a maximum size of 4 KB (4096 bytes)"; "APNs stores only one notification per bundle ID."; "Your notifications may also get throttled, saved in storage, and in some cases, not delivered." | V\* |
| 410 is not an uninstall signal | APNs documents 410 as "The device token is no longer active for the topic." An Apple engineer: "The 410 status was never meant to be a signal for developers to determine that the app has been uninstalled." and "…beginning the return of the 410 state is non-deterministic for the sole purpose of discouraging this interpretation." (thread 747482, Feb 2024) | V\* |
| No delete callback | A community answer: "No, there's no function call or method called when your application is getting deleted (or about to get deleted)." (A3.7) | S |
| Silent push | "the system doesn't guarantee their delivery"; "don't try to send more than two or three per hour"; it needs the remote notifications background mode; "If something force quits or kills the app, the system discards the held notification." The system "does not automatically launch your app if the user has force-quit it" | V |
| New binary | `UIBackgroundModes` is `["location", "fetch"]` (`app-next/config/native.ts:126`); remote notifications need `remote-notification` there. `docs/ota.md:75`: "An OTA may carry anything the reviewed binary already contains" | V ; R |
| ASC Deletions metric | Aggregate, opted-in users only (A3.9); not a per-user signal | V |

### E6. Who a touch can reach

| Person | Local touches | Server push | Basis |
|---|---|---|---|
| Downloaded, never launched | None scheduled: no app code has run | None: no token | E1 |
| Launched, permission not granted | The repo refuses to schedule unless status is granted; the system ignores attempts when denied | Silent delivery only, if a token exists | E2, E5 |
| Provisional | Delivered quietly to Notification Center history | Same | E3 |
| Granted, later switched off in Settings | Already-scheduled requests: not documented [U] | Silent only | E2 |
| App deleted | Not documented [U] | 410 is not a reliable signal | E2, E5 |
| Two devices | Two independent sets | One token per device | E4, E5 |

### E7. Feasibility of the proposed nine touches, from the rows above

**Technically possible.** All nine as elapsed-time local notifications scheduled at first launch, if the person granted permission. They fire with the app closed and stay far below the only published cap. The existing id-based cancel and replace code can remove them whenever the app runs and sees an entitlement. `interruptionLevel` `passive` or `active` can be set from JavaScript. An OTA could technically carry the scheduling code, since `expo-notifications` is already in the binary; the plan bars that because it would contradict the review notes (Appendix C2 row 22).

**Not possible or not knowable.**
- Measuring "download" (E1).
- Reaching anyone who never launches the app, denies permission, or turns notifications off (E2, E3, E6).
- Suppressing or editing a scheduled touch when the app is closed, or learning of a purchase elsewhere without a server push (E2, E4).
- A silent-push wake to cancel touches: it needs a new binary, is capped at "two or three per hour", is not guaranteed and is discarded after a force-quit (E5).
- Treating APNs 410 as churn or uninstall (E5).
- An anchor guaranteed to survive deletion (E1).
- Time Sensitive delivery for promotional touches (E3).

**Hard dependencies.** Notification authorization, asked once at onboarding step `S3d` (Appendix C2 row 14); a first launch to schedule anything and a chosen anchor; an explicit marketing opt-in plus an in-app toggle (E3); an ADR replacing PRD §3.14. Send-time gating on entitlement would need a server token store, an APNs `.p8` key, an entitlement feed and a privacy-label review, none of which exist and none of which I propose.

**Conflicts with the app's own commitments.** PRD §3.14 ("no promotional pushes", quiet hours 22:00-07:00), the review notes ("Notifications: trial reminder only.", Appendix C2 row 22 and C3), and the HIG line against repeating "the same thing".

**Mechanics of the recommended alternative [H].** At first launch after a separate opt-in, store a first-launch marker on the device. Schedule up to three fixed ids for day 2, 7 and 21 as elapsed-time requests, so each replaces rather than duplicates. On every foreground, cancel them if the entitlement is `trial` or `active`. Keep the interruption level at `active` or `passive`. Add a Settings toggle that cancels all three. Change the foreground handler so it does not banner while the paywall is showing. A window of 09:00-20:00 local cannot be guaranteed with elapsed-time triggers across time-zone changes. A calendar trigger with an explicit hour would follow local time, but its DST behaviour is not documented [U], so verify it on a device before relying on it.

### E8. Expo 57.0.21 and Adapty details that matter

| Item | Fact | Status |
|---|---|---|
| Handler timeout | "The function should respond with a behavior object within 3 seconds, otherwise, the notification will be discarded." (`node_modules/expo-notifications/build/NotificationsHandler.d.ts:38`). The app's handler answers immediately with banner, list and sound | V ; R |
| Repeating minimum | "On iOS, when `repeats` is `true`, the time interval must be 60 seconds or greater." (`node_modules/expo-notifications/build/Notifications.types.d.ts:334`) | V |
| Cancel | `cancelScheduledNotificationAsync(id)` is what the repo uses (`notifications/ExpoLocalNotifications.ts:23`); denied status cancels the id and throws (E2) | R |
| Adapty push | Adapty's own push feature is developer-facing (sent to the developer team through Adapty's mobile app): "The total number of notifications for all your apps combined is limited to 1000/day." End-user messaging goes through the Braze, OneSignal and Pushwoosh integrations; Customer.io, Iterable, Klaviyo and CleverTap are not on Adapty's integrations page | V\* |

## Appendix F. QA matrix, instrumentation and rollout gates

Everything here is a proposal [H] built on the sources in Appendices A to E. Nothing was run, configured or submitted.

**Apple testing sources, all read 2026-09-28.** [Manage sandbox Apple Account settings](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/manage-sandbox-apple-account-settings/); [Testing subscriptions and in-app purchases in TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/); [Testing win-back offers in the sandbox environment](https://developer.apple.com/documentation/storekit/testing-win-back-offers-in-the-sandbox-environment); [Testing win-back offers in Xcode](https://developer.apple.com/documentation/StoreKit/testing-win-back-offers-in-xcode); [Testing in-app purchases with sandbox](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox); [WWDC26 session 309](https://developer.apple.com/videos/play/wwdc2026/309/) for retention messages in the sandbox.

### F1. How this repo verifies, and what that cannot prove

- `ARCHITECTURE.md` rule 7: "No tests. Verification is `./excer check` (static), `./excer prove <feature>` (drives the real app on a simulator and captures evidence) and `./excer server smoke` (real API and Postgres, stubbed vendors)." [R]
- The `paywall` feature (`.agents/skills/verify-excerlock/references/features/paywall.md`) has scenarios `trial-active`, `trial-expired` and `billing-issue` and proof blocks for the billing issue, the win-back after a lapse and a lapse in session. It warns: "In a dev build the paywall is a local stand-in with dash prices. Seeing real prices means the real runtime is running". So a simulator proof can show flow and copy, but not real StoreKit prices, offers or eligibility [R].
- Adapty's iOS SDK skips Xcode-environment transactions, and its docs say local `.storekit` testing "is local, so no changes will appear on the Adapty dashboard" [P ; V\*]. Xcode-only runs never reach Adapty.
- Real Screen Time shields, HealthKit and physical motion cannot be verified in the simulator (`verify-excerlock` skill) [R].
- Any new offer surface or reminder needs its own scenario and proof block before it counts as verified.

### F2. What each environment can and cannot show

| Environment | Can show | Cannot show | Status |
|---|---|---|---|
| Xcode StoreKit configuration | Offer set-up and purchase UI. "To test win-back offers in Xcode, set up the offers in your StoreKit configuration file." Eligibility is "a simplified Eligible or Not Eligible setting that bypasses any other eligibility criteria." | Real eligibility rules; anything in Adapty | V |
| Sandbox (sandbox Apple Account) | Intro, promotional and win-back offers: "In the sandbox environment, test accounts are automatically eligible for win-back offers when they have an expired subscription." Retention messages "are fully testable in sandbox." Adapty labels events `Sandbox` or `Production` | Real time: "By default, accounts are set to a speed equalization of 1 month = 5 minutes", and "Subscriptions automatically renew up to 12 times". Product metadata changes "may take up to 1 hour" to appear. Clearing history makes the account "eligible for introductory offers" again | V ; V\* |
| TestFlight | StoreKit views and APIs | The win-back sheet and App Store redemption (extraction; re-check before relying on it). "Each subscription is renewed daily, up to 6 times within a 1-week period, regardless of the subscription's duration." | V ; V\* |
| Production | Real eligibility, prices, proceeds and tenure | Anything reversible: this is observation only | n/a |

Sandbox and TestFlight renew on accelerated clocks, so the 85% rate after one year of paid service and the 60-day lapse reset (Appendix D1) cannot be seen there. Whether the sandbox models them is not documented [U]. Confirm proceeds in production from App Store Connect after real renewals.

### F3. QA matrix

| # | State to test | What must be true | Where |
|---|---|---|---|
| 1 | Never paid, first paywall | Billed amount is the most prominent price; renewal sentence after any trial; Terms and Privacy links in the flow; the offer label matches the offer type | Xcode, sandbox, `./excer prove paywall` for copy |
| 2 | Never paid, promotional offer on the standard annual | The offer is signed and returned only for the intended cohort; price, period and standard price after the offer are all shown. Whether a never-subscribed account can redeem one is undocumented (A1.5), so test it and record the result | Sandbox on a device |
| 3 | Trial active | No promotional touch; the trial-ending reminder still fires two days before `accessExpiresAt` | Device |
| 4 | Auto-renew off before expiry | The Adapty profile reports renewal off; a save offer shows once per period and stops after dismissal or purchase | Sandbox |
| 5 | Trial ended, never paid | A promotional offer shows on the standard annual, not an Apple win-back offer; the lapse paywall still presents once and is dismissible (ADR 0024) | Sandbox, `./excer prove paywall` (`winback-after-trial`) |
| 6 | Paid, then lapsed | The win-back offer appears in Apple's sheet and Manage Subscriptions; the default launch sheet behaviour on iOS 18 is understood and described in the review notes | Xcode and sandbox (not TestFlight) |
| 7 | Billing retry or grace | No win-back offer ("aren't eligible"); the app maps the state to `billingIssue` and shows no offer | Sandbox, `./excer prove paywall` (`billing-issue`) |
| 8 | Current paid, cancels in Settings | Apple's Confirm Cancellation page shows the default or offer message and nothing in the app interferes; the app learns of it afterward | Sandbox |
| 9 | Two devices | A purchase on device B cancels device A's reminders at A's next foreground; A's reminders fire if A is not opened | Two devices |
| 10 | Notification permission states | Granted, denied, provisional and switched off later: no crash, no touch scheduled unless granted, the consent choice and Settings toggle agree | Device |
| 11 | Reminder timing | Elapsed-time touches fire at the intended interval with the app closed; force-quit, reboot, delete and reinstall behaviour is recorded because Apple does not document it | Device |
| 12 | Time zone and DST | A time-zone change and a DST crossing between scheduling and firing; calendar-trigger behaviour recorded | Device |
| 13 | Foreground handler | A touch arriving while the paywall is open does not banner over it | Device, `./excer prove` |
| 14 | Accessibility and localization | Dynamic Type, VoiceOver reading the billed amount, US English strings and storefront price formatting; Retention Messaging needs a default per product and locale | Device |
| 15 | Analytics | Events carry only the allowlisted properties in F5; nothing from Conditions, steps, gym, location or Screen Time; nothing when analytics is off | `./excer check`; the `analytics` feature proofs, if any exist |

### F4. Rollout and rollback gates

| Step | Ships as | Gate to ship | Stop or roll back | What cannot be recalled |
|---|---|---|---|---|
| Phase 0: disclosure fix and baseline | New binary through App Review | `./excer check`; paywall proofs; real-StoreKit check that the billed amount leads | A corrected build | Nothing beyond the build |
| Phase 1: Retention Messaging | Apple-side configuration, no binary | Default message per product and locale; sandbox test; copy passes "Don't upload content that is misleading or inaccurate." | Pause in App Store Connect or Adapty; how fast is not documented [U] | A message already shown |
| Phase 1: win-back offers | Apple-side configuration, no binary | Sandbox-verified; review notes updated; a decision on the default launch sheet | Apple: an offer starts at least a day out, runs at least 3 days and its price cannot be changed; whether one can be ended early was not found [U] | Offers surface in Manage Subscriptions and the in-app sheet "even if you do not promote" them |
| Phase 1: in-app save offer | New binary | Type-aware offer copy in `mapProduct`; new scenario and proof block; sandbox on a device | Remove or replace the offer in Adapty. Products and offers on a paywall change only "while it's in the Draft state, or within 30 days of creating it if it has no transactions yet"; "Flows don't have this restriction" (Appendix B3) [V\*] | Purchases made |
| Phase 2: opt-in reminders | New binary | ADR; review notes updated; consent screen and Settings toggle; a kill switch in the binary; F3 rows 9 to 13 pass; the holdout and kill criteria fixed in writing | The user toggle; a remote flag read on foreground cancels the three ids. A new PostHog flag is new-submission material (`docs/ota.md:73-91`, ADR 0032) | Touches already scheduled on devices that do not open the app again. Blast radius: at most three ids over 21 days |
| Phase 3: price test | Adapty configuration | Single subscription group chosen; sample size and stopping rule fixed; the Account Holder's fairness decision | End the test. Adapty: "Once a test is live, it cannot be changed." and "Stopping an A/B test is irreversible — the test cannot be restarted." (Appendix D6) [V\*]. A price decrease applies to all existing subscribers (Appendix D4) | Prices existing subscribers already saw |

No step sends email, changes server code or migrates data.

### F5. Instrumentation, coarse and consented [H]

The analytics registry is closed: an event needs an entry in its domain module and the taxonomy table, one owner (`client`, `server` or `adapty`), and a `snake_case` past-tense name (`packages/analytics-events/README.md`, rules D3, D4 and D12). Subscription and revenue events come only from the Adapty integration (README rule D9), and price decisions stay in Adapty (rule D7).

| Candidate event (owner `client`) | Allowed properties | Purpose |
|---|---|---|
| `offer_shown` | `surface` (paywall, save, winback), `offer_kind` (intro, promotional, win_back), `plan` (annual, monthly) | Exposure denominator |
| `offer_dismissed` | same | Dismissal rate |
| `reminder_optin_answered` | `answer` (on, off) | Consent rate |
| `reminder_toggle_changed` | `state` (on, off) | Opt-out rate |

Purchases, trials, cancellations, refunds and renewals stay Adapty-owned. No property may carry a Condition, step count, place, app identity or Screen Time value (rule D12). The `analyticsEnabled` default of `true` conflicts with the taxonomy's opt-in wording (Appendix C3), so settle that first. A no-touch holdout would bucket on `$device_id` (rule D8) and needs its own registry entry, which is new-submission material.

### F6. Documents to change before each phase

- `docs/asc/review-notes.md` (lines 24-25 say "Notifications: trial reminder only."): describe any new notification, offer or Retention Messaging use (guideline 2.3.1(a)).
- An ADR from `docs/adr/TEMPLATE.md` replacing PRD §3.14's "no promotional pushes", and PRD §3.14 itself.
- `docs/subscriptions.md`: the three subscription groups and any new product, offer or price.
- `packages/analytics-events` registry and taxonomy for F5.
- The `paywall` feature file's proof blocks; `CONTEXT.md` if a new term is coined (for example the in-app save offer).
- App Privacy answers, only if a push token is ever collected (Appendix E3).

## Appendix G. Vendor and competitor proxies [P]

Every figure here is someone else's data. None is ExcerLock data or a forecast. I found no proxy that tests an escalating 10-minute-to-30-day discount cadence, a controlled cancel-time discount in an iOS app, or an offer at app deletion. Samples and definitions differ between vendors. Status: **V** read verbatim in a saved page or PDF; **S** seen only through a search highlight, a fetch-tool extraction or a secondary site; **U** unverified or conflicting. Quotes are as printed. All pages were retrieved 2026-09-28.

### G1. Push opt-in, frequency and opt-out

| Figure | Source and date | Limits | Status |
|---|---|---|---|
| iOS opt-in, 2024 data: 74.1% (90th percentile), 49.4% (median), 27.1% (10th). 2023: 73.9%, 49.1%, 27.3% | Airship 2025 Push Notification Benchmarks (PDF metadata 2025-03-19; data Jan-Dec 2024) | The share of an app's audience opted in, averaged over 12 months, from Airship customer apps with at least 1,000 active users; brand-heavy; not prompt acceptance. The per-vertical iOS bars print no values | V |
| iOS opt-in by category: Health & fitness 33.5%; Productivity 44.8%; range 20.6% (Games) to 51.6% (Utilities). Android health & fitness 43.2% | OneSignal Mobile App Benchmarks 2024 (published 2024-09-17, modified 2026-03-05) | No sample size or definitions on the page | V |
| Airship 2026 edition claims "near parity" between iOS and Android | Airship blog 2026-03-31; the report is behind a form | No figures seen. Secondary claims of iOS "54%" and "56%" have no primary source | S ; U |
| "the top two reasons for opting out of brand communications were the same across seven countries: messages were either too frequent or weren't relevant/personalized to an individual's needs." | Airship 2025 PDF, p.21 | Survey n and question wording not given; no frequency threshold | V |
| "Customers who are opted-in to push notifications have 13% more purchases compared to opted-out customers, according to Airship research." | Airship 2025 PDF, p.7 | Association, no method | V |
| "2-5 pushes per week will drive 46% of people to opt-out. And 32% of people said they would uninstall if 6-10 messages per week were delivered." | Archived 2016 Apsalar post on 2015 Localytics data | Stated intent from a survey with no sample shown. Later aggregators re-quote it with different wording (opt out versus uninstall; 46% versus 43%) and some attribute it to Airship; it is not in the Airship PDF | S ; U |

Braze's 2016 opt-out article rests on a survey of 14 staff and says its results "clearly aren't statistically significant"; I did not use it. No proxy tests a burst of touches in the first 24 hours after install.

### G2. When people convert

| Figure | Source | Limits | Status |
|---|---|---|---|
| "Health & Fitness: 82.1% on Day 0." of trial starts; "After Day 3, trial starts drop below 5% in all categories." | RevenueCat State of Subscription Apps 2026 (over 115,000 apps; no date printed) | Share of trial starts by day since install, not the response to any later offer | V |
| "89.4% of trial starts happen on Day 0"; "Days 1-3 account for 2.0% of trial starts." | Adapty State of In-App Subscriptions and blog, 2026-03-13 | Adapty's "Rushing the paywall into Days 1-3 likely has near-zero ROI." is its interpretation | V |
| "3-day trials: 55.4% cancel on Day 0." "7-day trials: 39.8% cancel on Day 0." "84% of 3-day trial cancellations and 64% of 7-day trial cancellations occur between Day 0 and Day 1." | RevenueCat 2026 | Relevant to a one-week trial | V |
| Health & Fitness medians: download-to-trial 6.9%; trial-to-paid 37.7% (top quartile above 51.4%); download-to-paid 2.9% (top quartile above 6.2%) | RevenueCat 2026 | Medians across apps, not installs; "North America" is not US-only | V |

The same RevenueCat page gives the Day-0 share of paid conversions as about 50.6% in one chart and "1/3" in another. These are shares of events that happened. They show that most trial starts occur on Day 0. They do not say how anyone responds to a later message or discount.

### G3. Win-back and lapsed users

| Figure | Source | Limits | Status |
|---|---|---|---|
| "Higher-priced subscriptions have the highest reactivation rate (11.9%)"; "Monthly churners have the highest reactivation rates across all regions, exceeding 13% in most cases."; "yearly plans struggle at 4.58%" | RevenueCat State of Subscription Apps 2025 (75,000 apps; data year 2024) | Organic returns within a year, not offer responses | V |
| "There's a small but meaningful cohort at Day 31+ (6.3% globally) — users who churned from the free tier and came back." | Adapty blog, 2026-03-13 | The share of trial starts at Day 31 or later, not an offer response | V |
| A 7-day trial offered to lapsed users: "trial starts increased by over 240%, trial conversion rate increased by over 30%, and average Proceeds Per User (PPU) from the reactivated cohort nearly doubled." | Superwall case study, 2025-12-03 | Photography app; a free trial, not a discount; no n or duration; vendor-published | V |
| "we offered 20% off to group A and 30% off to group B. Both groups converted at the same rate" | RevenueCat blog (Aperture), 2024-06-27 | An email or web flow; no n | S |
| "126 lapsed users came back." | App Masters case study | No denominator, discount depth or retention | S |

### G4. Cancel-flow saves and abandon offers

- Apple's own averages, with its caveat, are in Appendix A2.8: +1.4 points (82%), and +5.5 points (223%) for promotional-offer messages, "varying results across developers".
- Web-SaaS vendors: Paddle's cancellation flows claim a "salvage rate" of 25-30% (marketing card, S). Churnkey: "Discount Offers help you recover 25-40% of customers who would otherwise cancel completely." (docs, S). Neither is iOS, and neither shows a method.
- One developer's blog (2026-06-14): "Day-90 churn dropped from 28% to 16%", "Retention offer acceptance: 38%", with average MRR per user down 8% and total MRR up 11%. No app is named and there is no control group (S).
- Superwall transaction-abandon paywalls (2024-08-06): conversion 8.9% for installers against 6.3% for people who abandoned a transaction, two different populations that were not randomized. The printed 6.3% does not match its own counts (5,128 / 87,403 = 5.9%). It reports refund rates of 6.8% and 3.3% (S).

### G5. Discount depth and annual price tests

| Figure | Source | Limits | Status |
|---|---|---|---|
| "Under 10% of apps use offers overall (9.3%); Health & Fitness leads at 14%"; "median discount is -50.1%"; "Countdown timers (≤1.4%) and progress bars (≤0.2%) are virtually absent." | RevenueCat 2026 | Prevalence across apps, not effect | V |
| "Only about 10% of apps across all categories use discounts." "The risk is training users to expect discounts, which erodes full-price conversion over time." | Adapty, 2026-03 | The second sentence is opinion with no evidence shown | V |
| "SellRaze used Superwall to A/B test its annual subscription price, pitting a $59.99 control against a lower $44.99 variant. The lower price point won decisively, delivering a 10% increase in Average Revenue Per User (ARPU)" | Superwall case study, 2025-12-19 | Reseller-tool app; no n or significance; vendor-published. The closest proxy to ExcerLock's $59.99 base | V |
| "The winning variant: $24.99 per year with a free 7-day trial." and a "131% increase in paywall conversion rate for the variant adding a free trial to the control's yearly price of $24.99" | Superwall case study (Stardust), 2024-09-12 | $24.99 was Stardust's base price, not a discount; a cycle tracker; no n, renewals or refunds | V |
| "we heightened yearly prices for new users by 50%, with minimal adverse effects on the free-to-paid conversion rate." | RevenueCat (Mojo), 2023-10-12 | No numbers for the yearly-price effect; vendor case study | V |
| "85% introductory discount, unique feature, and TikTok buzz boosted install-to-pay conversion from 3% to 14%"; "Comparing LTV-30 in November (no trials) vs. June: we dropped from $55 to $10 (-81%)." | RevenueCat, 2025-07-18 | Confounded by a viral trend | V |

Read together, the price tests point both ways (a cut won at SellRaze; a 50% rise had "minimal adverse effects" at Mojo) and none reports significance, renewals or refunds. They do not identify an optimum, and I derive none.

### G6. Discount conditioning (almost all non-subscription evidence)

| Study | Finding as printed | Strength | Status |
|---|---|---|---|
| Anderson and Simester, *Marketing Science* 23(1), 2004 | "Deeper price discounts in the current period increased future purchases by first-time customers (a positive long-run effect) but reduced future purchases by established customers (a negative long-run effect)." | Field experiments on catalog durable goods | S |
| Supermarket promotion-depth experiment (Chile) | "treated customers were 22.4% more likely to buy promoted items than their control counterparts, despite facing the same promotional deals" | Strong causal, grocery | S |
| Ascarza, Iyengar and Schleicher, *JMR* 53(1), 2016 | "While only 6% of customers in the control condition churned during the three months following the intervention, 10% did so in the treatment group." | Proactive plan recommendations, not cancel-time offers | S |
| Tsujikawa et al. (listed 2026-03-23) | "coupon redemption decreases the probability of churn by approximately 10 percentage points" | Counter-evidence; about 130,000 Japanese retail customers | S |
| Datta, Foubert and Van Heerde, *JMR* 52(2), 2015 | Free-trial customers were "staying only 1/3 as long as regular customers" | Digital TV subscription, observational | S |

The literature supports a cautious hypothesis, not a finding for this app: repeated or deep discounts can change what established customers later expect, and effects differ by customer type. No quantified study of a subscription app was found, so "escalating discounts teach people to wait" stays [H].

### G7. Competitor observations (ScreensDesign recordings)

Observed text is OCR from screen recordings and the tool's own summaries; store price lists were read from public App Store pages on 2026-09-28. Competitor behaviour is not evidence of effectiveness or compliance.

| App | Annual price seen | Trial | Exit or urgency seen | Notification copy seen |
|---|---|---|---|---|
| Pushscroll | "$149.99 $49.99 per year"; second screen "$29.99 / yr" | None on the two paywall screens | "9 spots remaining"; "One-time offer", "87% OFF FOREVER", "Close this screen? This price is gone" | None recorded |
| Unrot | "$69.99/year"; final offer "$34.99/year" | Not seen | "Special offer expires in 04 34"; "93% OFF"; "You will never see this again!" | "We'll send you gentle reminders to help you stay on track" |
| Brainrot | "Billed as $49.99 / year"; offer "$24.99/year" | Not seen | Second screen "50% OFF FOREVER" | None recorded |
| Useless | Apple sheet "$24.99 per year" | 3 days | "70% OFF" badge only | "We'll notify you 24h before the free trial ends." |
| Opal | "$99.99/year" | 7 days | No urgency seen | "Day 6 ... We'll send you a notification with a report" |
| BePresent | "$59.99 billed annually after trial" | 7 days | Social proof only; no exit offer | "You'll get a reminder 2 days before your trial ends" |
| ClearSpace | "7-day free trial, then $59.99/yr" | 7 days | None seen | "Day 5: get reminder about trial" |
| one sec | "$19.99 / Year" | One week | None | None |
| Friend Controls | "$14.99 / year" | None | "Creator is Begging" banner | None |

Recording links (exactly as the tool returned them): [Pushscroll](https://screensdesign.com/apps/pushscroll-screen-time-control/), [Unrot](https://screensdesign.com/apps/unrot-earn-your-screentime/?vs=280154), [Brainrot](https://screensdesign.com/apps/brainrot-screen-time-control/?vs=280044), [Useless](https://screensdesign.com/apps/useless-screen-time-control/?vs=273773), [Opal](https://screensdesign.com/apps/opal-screen-time-control/?vs=132738), [BePresent](https://screensdesign.com/apps/bepresent-screen-time-control/?vs=257958), [ClearSpace](https://screensdesign.com/apps/clearspace-reduce-screen-time/?vs=16779), [one sec](https://screensdesign.com/apps/one-sec-screen-time-focus/?vs=213324), [Friend Controls](https://screensdesign.com/apps/friend-controls-screen-time/?vs=273066).

$24.99 appears as Brainrot's "50% OFF FOREVER" offer against $49.99, as Useless's regular yearly price with a 3-day trial, and as Stardust's base price (G5). Prices ranged from $14.99 to $99.99 across the nine apps.

What the library does not hold: no recorded cancel, retention, account-deletion or win-back flows (a flow search returned 8 of 205 flows, all paywall, offer or onboarding) and no re-engagement push copy beyond permission warm-ups and trial reminders. Whether any "one-time" or "never see this again" claim holds cannot be told from a recording.

Recent low-star US reviews (anecdotes, not prevalence) complain of the pattern: "I pressed the X button and guess what it said hey you can get 50 off forever" (Brainrot, 2026-09-06); "forcing a 50% off and a 80% off in your face without a cancel button until you delete the app or pay" (Brainrot, 2026-08-14); "Nonstop notifications ... constantly blowing up my phone with notifications at all hours of the day." (Opal, 2026-09-14). The observed countdowns, "never see this again" claims and second offers on close are the kind of tactic the plan's guardrails exclude (section 7). Whether any of these apps complies with the rules is not established here.

### G8. Reliability flags

1. RevenueCat's 2026 page text is internally inconsistent: Day-0 paid conversion (50.6% versus "1/3"), the category with the lowest Day-0 trial-start share (Productivity 78% versus Education 78.5%), and 10.7% called download-to-paid on the report page and trial-to-paid in the companion blog.
2. Samples differ: RevenueCat 2026, over 115,000 apps and more than $16 billion in revenue; RevenueCat 2025, 75,000 apps; Adapty, about 16,000 apps (recorded earlier, not re-read); Airship, brand apps with at least 1,000 active users. RevenueCat's category buckets ("Health & Fitness: includes Health & Fitness, Medical") decide which comparator fits ExcerLock, and that is the owner's call.
3. Day-0 and Day-31+ figures are shares of events, not offer response rates.
4. Airship's opt-in figure is the share of an app's audience opted in, not the acceptance rate of the permission prompt.
5. Vendor case studies are self-published and report no significance tests.
6. Reviews and competitor recordings are single observations.

## Appendix H. What is unverified, and how to settle it

Treat nothing on this list as established. "Settle by" names who or what can resolve it. Items the plan depends on are marked **●**.

**Access limits during this research.** Apple Developer Forums threads 13846 and 747482 (and 811265 and 708732) returned a bot-verification page in the final pass, so the quotes taken from the first two rest on earlier reads through a fetch tool and are labelled V\* or S. Apple's Retention Messaging request form and the Family Controls entitlement page redirect to Apple ID sign-in and were not opened. `asc storekit retention-messaging ...` failed with "default StoreKit credentials not found". The March 2026 Federal Register page redirected to a bot interstitial. Web-archive fetches were unreliable.

### H1. Apple surfaces

| # | Item | Why it matters | Settle by |
|---|---|---|---|
| 1 | ● An Apple-owned offer when someone long-presses the icon to delete: **not found** in any Apple source read (A3). No API called "Offer Sheet" was found (B4) | The request assumes both exist | Apple Developer Support question from the Account Holder; a device check on the current iOS release |
| 2 | The exact wording and behaviour of any alert shown at deletion on current iOS: I read only Apple's Support page (published Sept 14, 2026) and a 2021 archived copy; no on-device check, and the iOS 26 and 27 release notes were not opened | The 2021 copy mentioned a "Cancel Subscriptions" option that the live page no longer shows | Device check |
| 3 | ● Whether Retention Messaging in App Store Connect is available to this account: Apple's pages conflict ("open to all" and "rolling out to all developers" against "Coming this fall") and the API is described as pre-release | Phase 1 depends on it | Account Holder, in App Store Connect |
| 4 | Retention message review turnaround; whether free-trial subscribers see a message; whether win-back or offer-code incentives can appear in one; retention-offer (`offerType` 5) eligibility rules and live status | Sets Phase 1 scope and timing | Account Holder; sandbox |
| 5 | Whether `Transaction` or `Status` updates fire when auto-renew is toggled off; App Store Server Notifications delivery latency (only the retry schedule is documented) | Decides how fast an in-app save offer can react | Sandbox test |
| 6 | Whether the real-time API interest form is Account Holder only (RevenueCat says so; the form was not opened) | Who must file it | Account Holder |
| 7 | Whether `AppTransaction.originalPurchaseDate` is identical on every device and equals the first free download; a discrepancy report (app-store-server-library-python #175, Feb-Mar 2026) was seen only in search | Anchor choice for any "time since acquisition" | Device test on a production build |

### H2. Offer eligibility

| # | Item | Why it matters | Settle by |
|---|---|---|---|
| 8 | ● Whether a never-subscribed account can redeem a signed promotional offer: Apple defines the audience as existing and previously subscribed customers and allows an appTransactionID in the signature, but states no enforcement (A1.5) | The trial-ended, never-paid cohort depends on it | Sandbox test; Apple Developer Support |
| 9 | Whether a trial-only churner counts toward win-back "Minimum Paid Duration" | Decides whether trial-only people are ever win-back eligible | Apple Developer Support; sandbox |
| 10 | Duration options for promotional and win-back offers on an annual product; whether the 10-active promotional limit and the 10-active offer-code limit are shared; whether an offer price may equal or exceed the regular price (forum evidence only) | Shapes the ladder in section 6 | App Store Connect (read the offer forms) |
| 11 | Whether win-back periods count toward days of paid service; the exact day the 15% rate starts ("greater than one year" against "accumulates one year"); commission on a refunded transaction | Two-year economics in Appendix D | Apple Developer Support; production reports |
| 12 | Whether a cancelled trial keeps access until trial end; whether `allowIntroductoryOffer: true` can override Apple's own ineligibility; the `subscriptionPromotionalOffer` OS tag; App Review Guideline text on offer codes; the exact phrase "per Apple Account" (only "each person" was found) | Edge cases in the state matrix | Sandbox test |

### H3. Adapty

| # | Item | Why it matters | Settle by |
|---|---|---|---|
| 13 | ● Which offer Adapty actually applies when several exist: the docs say intro first, the SDK code says eligible win-back, then a configured promotional offer, then an eligible intro (B3) | Decides what a person sees | Sandbox test with a configured promotional offer |
| 14 | Whether the In-App Purchase key is uploaded in Adapty; which offers are attached to live products (the bundled fallback exported 2026-09-17 shows none); the backend rule behind `promotional_offer_eligibility` | Promotional offers need signing | Adapty dashboard (Account Holder or admin) |
| 15 | Whether win-back redemptions appear in Adapty analytics; whether the profile the app reads is derived locally or from the backend; whether the RN wrapper exposes the iOS 4.2.0 `storeMessagesHandling`; which Adapty plan includes audiences, A/B tests and Retention Messaging | Measurement and cost | Adapty support or dashboard |
| 16 | Adapty test guidance for promotional and win-back offers: not found (`testing-on-ios.md` returned 404) | QA in Appendix F | Adapty support |

### H4. Policy and legal

| # | Item | Why it matters | Settle by |
|---|---|---|---|
| 17 | ● The Build 12 rejection reason (not in the API) | May decide everything in Phase 0 | Account Holder, in App Store Connect |
| 18 | ● Whether guideline 4.10 ("Screen Time APIs") reaches a paywall on this app: no precedent found, "monetize" is undefined, and the Family Controls entitlement conditions were not opened | Could block any paid step | App Review clarification |
| 19 | How App Review applies DPLA Attachment 1 §2.2 to Local Notifications in practice; no numeric threshold for "excessive" | Sets the cadence ceiling | Apple Developer Support |
| 20 | Whether new offers or notifications must be reported to App Review: no App Store Connect page I read requires it; the plan describes them in the review notes anyway (2.3.1(a)) | Review risk | Account Holder |
| 21 | ● Auto-renewal and cancellation law: no official source says Apple's cancellation UI satisfies state or federal obligations; only California was read; other state laws, CAN-SPAM, TCPA, COPPA and Texas SB 2420 were not researched; the California text came through a summarizer and should be re-read on leginfo; the FTC comment deadline came from secondary snippets | Legal exposure of any save offer | Counsel |

### H5. Economics

| # | Item | Why it matters | Settle by |
|---|---|---|---|
| 22 | ● The currency and period of "$24.99": I assumed USD annual | Every break-even figure | The requester |
| 23 | ● Small Business Program status, and whether App Store Connect price-point proceeds reflect it (they show exactly 70% and 85%); Exhibit B (regions and tax) was not completed | Could add 21.4% to year-1 proceeds | Account Holder; Subscription Report ratio of Developer Proceeds to Customer Price |
| 24 | US per-state sales-tax mechanics; any Apple statement in those words that a US list price excludes sales tax | Net price per payer | Apple tax documentation; production reports |

### H6. Notifications and platform

| # | Item | Why it matters | Settle by |
|---|---|---|---|
| 25 | Pending local requests after deletion, reinstall, reboot or force-quit; calendar-trigger behaviour across time zone and DST changes; the modern pending-request cap (only the legacy 64 is published) | Reminder reliability | Device tests (Appendix F3 rows 11 and 12) |
| 26 | Whether an APNs token counts as a "Device ID" on the privacy label; DeviceCheck persistence across reinstall; Keychain persistence across deletion (undocumented) | Only if server push or a stored anchor is ever built | Apple Developer Support |
| 27 | Whether `expo-application` is linked into Build 12; whether Build 12's entitlements carry the production `aps-environment` (repo documents only) | Anchor options; push readiness | Build inspection |
| 28 | Whether `./excer check` enforces "no push registration": the ship plan lists a grep guard, and I found no such rule in `tools/excer/checks`, the ESLint plugin or `app-next/eslint.config.js`; `./excer check` was not run | Would block Phase 2 code if it exists | Repo owner |

### H7. Evidence that does not exist

- Any study of an escalating post-download discount cadence (10 minutes to 30 days).
- Any controlled iOS study of a cancel-time discount, or any Apple save-rate figure beyond the averages in A2.8.
- Any data on a delete-time offer.
- Any quantified study of discount conditioning in subscription apps.
- Airship's 2026 opt-in percentiles (form-gated) and the original source of the 46% and 32% figures.
- Any measured effect on the Superwall exit-offers page, Amazon's retention-offers document or RevenueCat's Customer Center documentation; they give mechanics only.
