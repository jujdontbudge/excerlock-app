import { createHash } from "node:crypto";
import type { Vendor } from "../../model/vendor.js";

export interface ParsedVendorNotification {
  externalUserId: string;
  eventType: string;
  deliveryKey: string;
  disconnectsConnection: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredIdentifier(
  payload: Record<string, unknown>,
  field: string,
): string {
  const value = payload[field];
  if (
    (typeof value !== "string" || value.length === 0) &&
    typeof value !== "number"
  ) {
    throw new Error(`Vendor webhook payload is missing ${field}`);
  }
  return String(value);
}

function requiredString(
  payload: Record<string, unknown>,
  field: string,
): string {
  const value = payload[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Vendor webhook payload is missing ${field}`);
  }
  return value;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function deliveryKey(payload: Record<string, unknown>): string {
  return createHash("sha256")
    .update(canonicalJson(payload))
    .digest("hex");
}

export function parseVendorNotification(
  vendor: Vendor,
  rawPayload: string,
): ParsedVendorNotification | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload) as unknown;
  } catch {
    throw new Error("Vendor webhook body must be valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new Error("Vendor webhook body must be a JSON object");
  }

  switch (vendor) {
    case "strava": {
      const objectType = requiredString(parsed, "object_type");
      if (objectType === "athlete") {
        const updates = parsed.updates;
        if (
          requiredString(parsed, "aspect_type") !== "update" ||
          !isRecord(updates) ||
          (updates.authorized !== false &&
            updates.authorized !== "false")
        ) {
          return null;
        }
        return {
          externalUserId: requiredIdentifier(parsed, "owner_id"),
          eventType: "athlete.deauthorize",
          deliveryKey: deliveryKey(parsed),
          disconnectsConnection: true,
        };
      }
      if (objectType !== "activity") {
        return null;
      }
      return {
        externalUserId: requiredIdentifier(parsed, "owner_id"),
        eventType: `${objectType}.${requiredString(parsed, "aspect_type")}`,
        deliveryKey: deliveryKey(parsed),
        disconnectsConnection: false,
      };
    }
    case "oura": {
      const dataType = requiredString(parsed, "data_type");
      if (dataType !== "daily_activity" && dataType !== "workout") {
        return null;
      }
      return {
        externalUserId: requiredIdentifier(parsed, "user_id"),
        eventType: `${dataType}.${requiredString(parsed, "event_type")}`,
        deliveryKey: deliveryKey(parsed),
        disconnectsConnection: false,
      };
    }
    case "whoop": {
      const eventType = requiredString(parsed, "type");
      if (!eventType.startsWith("workout.")) {
        return null;
      }
      return {
        externalUserId: requiredIdentifier(parsed, "user_id"),
        eventType,
        deliveryKey: deliveryKey(parsed),
        disconnectsConnection: false,
      };
    }
    case "polar": {
      const eventType = requiredString(parsed, "event");
      if (
        eventType !== "EXERCISE" &&
        eventType !== "ACTIVITY_SUMMARY"
      ) {
        return null;
      }
      return {
        externalUserId: requiredIdentifier(parsed, "user_id"),
        eventType,
        deliveryKey: deliveryKey(parsed),
        disconnectsConnection: false,
      };
    }
  }
}
