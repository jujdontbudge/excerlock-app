import type { Environment } from "../env.js";
import type { Vendor } from "../vendors/types.js";

export type VendorWebhookConfiguration =
  | {
      vendor: "strava";
      verifyToken: string;
      subscriptionId: string;
    }
  | {
      vendor: "oura";
      clientSecret: string;
      verifyToken: string;
    }
  | {
      vendor: "whoop";
      clientSecret: string;
    }
  | {
      vendor: "polar";
      signatureSecret: string;
    };

interface Setting {
  name: string;
  value: string | undefined;
}

function requireSettings(
  vendor: Vendor,
  settings: readonly Setting[],
): readonly string[] {
  const missing = settings
    .filter((setting) => !setting.value)
    .map((setting) => setting.name);
  if (missing.length > 0) {
    throw new Error(
      `${vendor} webhooks are not configured; missing ${missing.join(", ")}`,
    );
  }
  return settings.map((setting) => setting.value as string);
}

export function requireVendorWebhookConfiguration(
  environment: Environment,
  vendor: Vendor,
): VendorWebhookConfiguration {
  switch (vendor) {
    case "strava": {
      const [verifyToken, subscriptionId] = requireSettings(vendor, [
        {
          name: "STRAVA_WEBHOOK_VERIFY_TOKEN",
          value: environment.stravaWebhookVerifyToken,
        },
        {
          name: "STRAVA_WEBHOOK_SUBSCRIPTION_ID",
          value: environment.stravaWebhookSubscriptionId,
        },
      ]);
      return {
        vendor,
        verifyToken: verifyToken as string,
        subscriptionId: subscriptionId as string,
      };
    }
    case "oura": {
      const [clientSecret, verifyToken] = requireSettings(vendor, [
        {
          name: "OURA_CLIENT_SECRET",
          value: environment.ouraClientSecret,
        },
        {
          name: "OURA_WEBHOOK_VERIFY_TOKEN",
          value: environment.ouraWebhookVerifyToken,
        },
      ]);
      return {
        vendor,
        clientSecret: clientSecret as string,
        verifyToken: verifyToken as string,
      };
    }
    case "whoop": {
      const [clientSecret] = requireSettings(vendor, [
        {
          name: "WHOOP_CLIENT_SECRET",
          value: environment.whoopClientSecret,
        },
      ]);
      return { vendor, clientSecret: clientSecret as string };
    }
    case "polar": {
      const [signatureSecret] = requireSettings(vendor, [
        {
          name: "POLAR_WEBHOOK_SIGNATURE_SECRET",
          value: environment.polarWebhookSignatureSecret,
        },
      ]);
      return { vendor, signatureSecret: signatureSecret as string };
    }
  }
}
