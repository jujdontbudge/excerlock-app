import type { Environment } from "../env.js";
import type { Vendor } from "./types.js";

export interface VendorOAuthConfiguration {
  clientId: string;
  clientSecret: string;
  callbackBaseUrl: string;
}

interface CredentialSetting {
  name: string;
  value: string | undefined;
}

const VENDOR_LABELS: Readonly<Record<Vendor, string>> = {
  strava: "Strava",
  oura: "Oura",
  whoop: "WHOOP",
  polar: "Polar",
};

function credentialSettings(
  environment: Environment,
  vendor: Vendor,
): readonly [CredentialSetting, CredentialSetting] {
  switch (vendor) {
    case "strava":
      return [
        { name: "STRAVA_CLIENT_ID", value: environment.stravaClientId },
        {
          name: "STRAVA_CLIENT_SECRET",
          value: environment.stravaClientSecret,
        },
      ];
    case "oura":
      return [
        { name: "OURA_CLIENT_ID", value: environment.ouraClientId },
        { name: "OURA_CLIENT_SECRET", value: environment.ouraClientSecret },
      ];
    case "whoop":
      return [
        { name: "WHOOP_CLIENT_ID", value: environment.whoopClientId },
        { name: "WHOOP_CLIENT_SECRET", value: environment.whoopClientSecret },
      ];
    case "polar":
      return [
        { name: "POLAR_CLIENT_ID", value: environment.polarClientId },
        { name: "POLAR_CLIENT_SECRET", value: environment.polarClientSecret },
      ];
  }
}

export function requireVendorOAuthConfiguration(
  environment: Environment,
  vendor: Vendor,
): VendorOAuthConfiguration {
  const settings = [
    ...credentialSettings(environment, vendor),
    {
      name: "VENDOR_OAUTH_CALLBACK_BASE_URL",
      value: environment.vendorOAuthCallbackBaseUrl,
    },
  ];
  const missing = settings
    .filter((setting) => !setting.value)
    .map((setting) => setting.name);

  if (missing.length > 0) {
    throw new Error(
      `${VENDOR_LABELS[vendor]} OAuth is not configured; missing ${missing.join(", ")}`,
    );
  }

  const [clientId, clientSecret, callbackBaseUrl] = settings.map(
    (setting) => setting.value,
  ) as [string, string, string];

  return { clientId, clientSecret, callbackBaseUrl };
}
