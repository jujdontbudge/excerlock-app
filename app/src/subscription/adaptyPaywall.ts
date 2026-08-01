import type { PaywallPlacement } from "@excerlock/analytics-events";
import type {
  AdaptyFlow,
  AdaptyPaywallProduct,
  AdaptySubscriptionPeriod,
} from "react-native-adapty";

import type {
  SubscriptionPaywallConfig,
  SubscriptionProduct,
} from "./SubscriptionModule";

type PaywallCopy = Readonly<{
  title: string;
  body: string;
  valueStatement: string;
  plansTitle: string;
  trialStatement: string | null;
  defaultProductId: string | null;
  productBadges: Readonly<Record<string, string>>;
}>;

/** Translate one Adapty experiment response without imposing a local plan shape. */
export function adaptyPaywallConfig(
  placement: PaywallPlacement,
  flow: AdaptyFlow,
  products: readonly AdaptyPaywallProduct[],
): SubscriptionPaywallConfig {
  const copy = paywallCopy(flow);
  return Object.freeze({
    placement,
    title: copy.title,
    body: copy.body,
    valueStatement: copy.valueStatement,
    plansTitle: copy.plansTitle,
    trialStatement: copy.trialStatement,
    products: Object.freeze(
      products.map((product) => adaptyProduct(product, copy)),
    ),
  });
}

function paywallCopy(flow: AdaptyFlow): PaywallCopy {
  const data = flow.remoteConfigs?.[0]?.data;
  return Object.freeze({
    title: stringValue(data, "title") ?? flow.name,
    body: stringValue(data, "body") ?? "",
    valueStatement: stringValue(data, "valueStatement") ?? "",
    plansTitle: stringValue(data, "plansTitle") ?? "Choose a plan",
    trialStatement: stringValue(data, "trialStatement"),
    defaultProductId: stringValue(data, "defaultProductId"),
    productBadges: stringRecordValue(data, "productBadges"),
  });
}

function adaptyProduct(
  product: AdaptyPaywallProduct,
  copy: PaywallCopy,
): SubscriptionProduct {
  const period = product.subscription?.subscriptionPeriod;
  const periodLabel =
    product.subscription?.localizedSubscriptionPeriod ?? period?.unit;
  const localizedPrice = product.price?.localizedString ?? "";
  return Object.freeze({
    id: product.vendorProductId,
    title: product.localizedTitle,
    price:
      localizedPrice && periodLabel
        ? `${localizedPrice} / ${periodLabel}`
        : localizedPrice,
    detail: product.localizedDescription,
    badge: copy.productBadges[product.vendorProductId] ?? null,
    trialDays: trialDays(product),
    durationDays: period === undefined ? 0 : periodDays(period),
    isDefault: copy.defaultProductId === product.vendorProductId,
  });
}

function trialDays(product: AdaptyPaywallProduct): number {
  const freeTrial = product.subscription?.offer?.phases.find(
    (phase) => phase.paymentMode === "free_trial",
  );
  return freeTrial === undefined
    ? 0
    : freeTrial.numberOfPeriods * periodDays(freeTrial.subscriptionPeriod);
}

function periodDays(period: AdaptySubscriptionPeriod): number {
  const daysPerUnit = {
    day: 1,
    week: 7,
    month: 30,
    year: 365,
  } as const;
  return period.numberOfUnits * daysPerUnit[period.unit];
}

function stringValue(
  value: unknown,
  key: string,
): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function stringRecordValue(
  value: unknown,
  key: string,
): Readonly<Record<string, string>> {
  if (!isRecord(value) || !isRecord(value[key])) {
    return Object.freeze({});
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value[key]).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
