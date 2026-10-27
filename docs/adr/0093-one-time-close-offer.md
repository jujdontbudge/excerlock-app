---
status: accepted
date: 2026-10-27
---

# 0093: One-time close offer on the onboarding Paywall

## Decision

The first Close on the onboarding Paywall opens a one-time close offer instead of leaving. It sells one product, the approved `com.johansardar.excerlock.premium.annual.2999.t3` ($29.99/year with a 3-day free trial), served by the Adapty placement `close_offer`. The screen is solid orange with white text and cards. It states the discount against the monthly plan the Paywall loaded ("75% OFF FOREVER" against $9.99/month; the $29.99 renewal price does not change), the yearly price per month, and the billed amount ("12mo · $29.99").

It shows once per install (`closeOfferSeen` in the onboarding store, set when the offer loads). Win-back and in-app Paywalls never show it. Closing it, any later Close, or an offer that cannot load or price itself takes the plain Close path: back to the step before the Paywall, or Welcome. Claiming admits like any purchase and goes to Setup. "I'd rather pay full price" returns to the Paywall, which reloads its plans because the offer replaced the loaded Adapty paywall. Analytics use placement `close_offer`.

It ships to 1.0.2 (runtime 8) as an OTA update: it is JavaScript only, uses an already approved product, and adds no new native code or App Store product.

## Context

The user asked to copy the MenuFit close-offer pattern in ExcerLock's look. No new App Store products are requested; $29.99/year is the cheapest approved annual price. The monthly equivalent is computed from StoreKit's price, so it reads $2.50, not $2.49. The discount appears only when both the yearly offer and a monthly anchor have numeric prices, so a store or currency without them falls back to the plain Close.

## Consequences

Some onboarding users who would have left see a cheaper annual plan once. The Adapty placement must keep serving a single yearly product; a product change there changes the screen's numbers. Paywall Close no longer always leaves on first tap, but it never grants access and never traps the user: the offer has its own Close.

## References

- `app-next/src/packages/paywall/lib/CloseOfferScreen.tsx`, `closeOffer.ts`, `leavePaywall.ts`
- Proofs `close-offer-once`, `close-offer-claim-to-setup`, `close-offer-layout`, `close-offer-full-price-returns-to-paywall` in the paywall feature
- [0092: The Paywall has no account link](0092-paywall-has-no-account-link.md) — **accepted**
