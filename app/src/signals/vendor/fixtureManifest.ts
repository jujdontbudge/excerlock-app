import {
  assertExactPayloadKeys,
  type FixtureManifest,
  type JsonValue,
  type TimelineRow,
} from "../timeline";
import type {
  Vendor,
  VendorConnectionState,
} from "./VendorProvider";

export const VENDORS = ["strava", "oura", "whoop", "polar"] as const;

export const VENDOR_FIXTURE_EVENTS = [
  "vendor.activityAvailable",
  "vendor.connectionChanged",
  "vendor.rateLimited",
] as const;

export type VendorFixtureEvent = (typeof VENDOR_FIXTURE_EVENTS)[number];

export interface VendorActivityAvailablePayload {
  readonly vendor: Vendor;
  readonly raw: JsonValue;
}

export interface VendorConnectionChangedPayload {
  readonly vendor: Vendor;
  readonly state: VendorConnectionState;
}

export interface VendorRateLimitedPayload {
  readonly vendor: Vendor;
  readonly retryAfterS: number;
}

export type VendorFixturePayload =
  | VendorActivityAvailablePayload
  | VendorConnectionChangedPayload
  | VendorRateLimitedPayload;

export type VendorTimelineRow =
  | TimelineRow<"vendor.activityAvailable", VendorActivityAvailablePayload>
  | TimelineRow<"vendor.connectionChanged", VendorConnectionChangedPayload>
  | TimelineRow<"vendor.rateLimited", VendorRateLimitedPayload>;

export interface VendorFixtureManifest
  extends Omit<
    FixtureManifest<VendorFixtureEvent, VendorFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly VendorTimelineRow[];
}

function isVendor(value: unknown): value is Vendor {
  return VENDORS.includes(value as Vendor);
}

export function assertVendorActivityPayload(
  payload: VendorFixturePayload,
): asserts payload is VendorActivityAvailablePayload {
  if (!isVendor((payload as Partial<VendorActivityAvailablePayload>).vendor)) {
    throw new Error("Invalid payload for vendor.activityAvailable");
  }
}

export function assertVendorConnectionPayload(
  payload: VendorFixturePayload,
): asserts payload is VendorConnectionChangedPayload {
  const candidate = payload as Partial<VendorConnectionChangedPayload>;
  if (
    !isVendor(candidate.vendor) ||
    !["disconnected", "connecting", "connected", "error"].includes(
      candidate.state ?? "",
    )
  ) {
    throw new Error("Invalid payload for vendor.connectionChanged");
  }
}

export function assertVendorRateLimitPayload(
  payload: VendorFixturePayload,
): asserts payload is VendorRateLimitedPayload {
  const candidate = payload as Partial<VendorRateLimitedPayload>;
  if (
    !isVendor(candidate.vendor) ||
    typeof candidate.retryAfterS !== "number" ||
    !Number.isFinite(candidate.retryAfterS) ||
    candidate.retryAfterS < 0
  ) {
    throw new Error("Invalid payload for vendor.rateLimited");
  }
}

export function validateVendorFixtureRow(
  row: TimelineRow<VendorFixtureEvent, VendorFixturePayload>,
): void {
  if (row.event === "vendor.activityAvailable") {
    assertExactPayloadKeys(row.payload, ["vendor", "raw"], row.event);
    assertVendorActivityPayload(row.payload);
  } else if (row.event === "vendor.connectionChanged") {
    assertExactPayloadKeys(row.payload, ["vendor", "state"], row.event);
    assertVendorConnectionPayload(row.payload);
  } else {
    assertExactPayloadKeys(row.payload, ["vendor", "retryAfterS"], row.event);
    assertVendorRateLimitPayload(row.payload);
  }
}
