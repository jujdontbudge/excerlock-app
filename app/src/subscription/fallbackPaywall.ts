import type {
  SubscriptionPaywall,
  SubscriptionProduct,
} from "./SubscriptionModule";

const FALLBACK_PRODUCTS: readonly SubscriptionProduct[] = Object.freeze([
  Object.freeze({
    id: "excerlock_annual",
    title: "Annual",
    price: "$59.99 / year",
    detail: "7 days free, then $59.99 per year",
    badge: "7 DAYS FREE · SAVE 50%",
    trialDays: 7,
    durationDays: 365,
    isDefault: true,
  }),
  Object.freeze({
    id: "excerlock_monthly",
    title: "Monthly",
    price: "$9.99 / month",
    detail: "Billed monthly",
    badge: null,
    trialDays: 0,
    durationDays: 30,
    isDefault: false,
  }),
]);

export const FALLBACK_ONBOARDING_PAYWALL: SubscriptionPaywall = Object.freeze({
  placement: "onboarding",
  title: "Unlock the full ExcerLock plan",
  body: "Choose the plan that helps you turn intention into a daily habit.",
  products: FALLBACK_PRODUCTS,
});
