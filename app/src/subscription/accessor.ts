import Constants from "expo-constants";
import type { StateStorage } from "zustand/middleware";

import {
  AdaptySubscriptionModule,
  type AdaptySDKPort,
} from "./AdaptySubscriptionModule";
import type { SubscriptionClock } from "./clock";
import { MockSubscriptionModule } from "./MockSubscriptionModule";
import { MOCK_SUBSCRIPTION_STORAGE_KEY } from "./mockStore";
import { NoopSubscriptionModule } from "./NoopSubscriptionModule";
import type {
  PremiumEntitlement,
  SubscriptionModule,
} from "./SubscriptionModule";

let subscriptionModule: SubscriptionModule | undefined;

export type SubscriptionRuntime = Readonly<{
  nodeEnv: string | undefined;
  adaptyKey: string | undefined;
}>;

export function shouldUseAdaptySubscriptionModule(
  runtime: SubscriptionRuntime,
): boolean {
  return runtime.nodeEnv !== "test" && Boolean(runtime.adaptyKey?.trim());
}

/**
 * The subscription composition root. Phase 5 changes only this constructor to
 * an Adapty adapter; callers continue to depend on the vendor-free interface.
 */
export function getSubscriptionModule(): SubscriptionModule {
  subscriptionModule ??= createSubscriptionModule(readSubscriptionRuntime());
  return subscriptionModule;
}

export function createSubscriptionModule(
  runtime: SubscriptionRuntime,
  sdk?: AdaptySDKPort,
): SubscriptionModule {
  if (runtime.nodeEnv === "test") {
    return new MockSubscriptionModule();
  }
  const apiKey = runtime.adaptyKey?.trim();
  if (!apiKey) {
    return new NoopSubscriptionModule();
  }
  const nativeSDK = sdk ?? loadAdaptySDK();
  return new AdaptySubscriptionModule(apiKey, nativeSDK);
}

/** Called by the account seam immediately after post-purchase Clerk sign-up. */
export async function identifySubscriptionCustomer(
  customerUserId: string,
): Promise<void> {
  const module = getSubscriptionModule();
  if (module instanceof AdaptySubscriptionModule) {
    await module.identifyCustomer(customerUserId);
  }
}

/** Composition-root injection for build-selected adapter implementations. */
export function installSubscriptionModule(
  module: SubscriptionModule,
): () => void {
  const previous = subscriptionModule;
  subscriptionModule = module;

  return () => {
    if (subscriptionModule === module) {
      subscriptionModule = previous;
    }
  };
}

export function installFixtureSubscriptionModule({
  entitlement,
  clock,
}: Readonly<{
  entitlement: "free" | "premium";
  clock: SubscriptionClock;
}>): () => void {
  const purchasedAtMs = clock.nowMs();
  const persistedEntitlement: PremiumEntitlement =
    entitlement === "premium"
      ? {
          status: "active",
          productId: "e2e-premium",
          purchasedAtMs,
          renewsAtMs:
            purchasedAtMs + 366 * 24 * 60 * 60 * 1_000,
        }
      : { status: "inactive" };

  return installSubscriptionModule(
    new MockSubscriptionModule({
      clock,
      storage: fixtureEntitlementStorage(persistedEntitlement),
    }),
  );
}

function fixtureEntitlementStorage(
  entitlement: PremiumEntitlement,
): StateStorage<Promise<void>> {
  const values = new Map([
    [
      MOCK_SUBSCRIPTION_STORAGE_KEY,
      JSON.stringify({
        state: { entitlement },
        version: 1,
      }),
    ],
  ]);

  return {
    async getItem(name) {
      return values.get(name) ?? null;
    },
    async setItem(name, value) {
      values.set(name, value);
    },
    async removeItem(name) {
      values.delete(name);
    },
  };
}

function readSubscriptionRuntime(): SubscriptionRuntime {
  const extra = Constants.expoConfig?.extra as
    | Readonly<{
        clientSubscription?: Readonly<{ adaptyKey?: unknown }>;
      }>
    | undefined;
  const configuredKey = extra?.clientSubscription?.adaptyKey;
  return {
    nodeEnv: process.env.NODE_ENV,
    adaptyKey:
      typeof configuredKey === "string"
        ? configuredKey
        : process.env.EXPO_PUBLIC_ADAPTY_KEY,
  };
}

function loadAdaptySDK(): AdaptySDKPort {
  const { adapty } = require("react-native-adapty") as typeof import("react-native-adapty");
  return adapty;
}
