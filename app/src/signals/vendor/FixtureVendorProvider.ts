import {
  TimelinePlayer,
  type FixtureManifest,
  type JsonValue,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  Vendor,
  VendorActivity,
  VendorConnectionChange,
  VendorConnectionState,
  VendorProvider,
  VendorRateLimit,
  VendorUnsubscribe,
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

function assertActivityPayload(
  payload: VendorFixturePayload,
): asserts payload is VendorActivityAvailablePayload {
  if (!isVendor((payload as Partial<VendorActivityAvailablePayload>).vendor)) {
    throw new Error("Invalid payload for vendor.activityAvailable");
  }
}

function assertConnectionPayload(
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

function assertRateLimitPayload(
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

export class FixtureVendorProvider implements VendorProvider {
  private readonly activities = new Map<Vendor, VendorActivity[]>();
  private readonly activityCallbacks = new Set<
    (activity: VendorActivity) => void
  >();
  private readonly connectionCallbacks = new Set<
    (change: VendorConnectionChange) => void
  >();
  private readonly connections = new Map<Vendor, VendorConnectionState>(
    VENDORS.map((vendor) => [vendor, "disconnected"]),
  );
  private readonly player: TimelinePlayer<
    VendorFixtureEvent,
    VendorFixturePayload
  >;
  private readonly rateLimitCallbacks = new Set<
    (rateLimit: VendorRateLimit) => void
  >();

  public constructor(
    public readonly fixture: VendorFixtureManifest,
    playback: TimelinePlayback = { mode: "manual" },
  ) {
    this.player = new TimelinePlayer<
      VendorFixtureEvent,
      VendorFixturePayload
    >({
      manifest: fixture,
      allowedEvents: VENDOR_FIXTURE_EVENTS,
      playback,
      onEvent: (row) => this.apply(row),
    });
  }

  public get currentTimeMs(): number {
    return this.player.currentTimeMs;
  }

  public async fetchToday(
    vendor: Vendor,
  ): Promise<readonly VendorActivity[]> {
    return this.activities.get(vendor) ?? [];
  }

  public getConnectionState(vendor: Vendor): VendorConnectionState {
    return this.connections.get(vendor) ?? "disconnected";
  }

  public onActivityAvailable(
    callback: (activity: VendorActivity) => void,
  ): VendorUnsubscribe {
    this.activityCallbacks.add(callback);
    return () => this.activityCallbacks.delete(callback);
  }

  public onConnectionChange(
    callback: (change: VendorConnectionChange) => void,
  ): VendorUnsubscribe {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  public onRateLimited(
    callback: (rateLimit: VendorRateLimit) => void,
  ): VendorUnsubscribe {
    this.rateLimitCallbacks.add(callback);
    return () => this.rateLimitCallbacks.delete(callback);
  }

  public advanceBy(milliseconds: number): void {
    this.player.advanceBy(milliseconds);
  }

  public advanceTo(atMs: number): void {
    this.player.advanceTo(atMs);
  }

  public dispose(): void {
    this.activityCallbacks.clear();
    this.connectionCallbacks.clear();
    this.rateLimitCallbacks.clear();
    this.player.dispose();
  }

  private apply(
    row: TimelineRow<VendorFixtureEvent, VendorFixturePayload>,
  ): void {
    if (row.event === "vendor.activityAvailable") {
      assertActivityPayload(row.payload);
      const activity: VendorActivity = {
        vendor: row.payload.vendor,
        atMs: row.atMs,
        raw: row.payload.raw,
      };
      const activities = this.activities.get(activity.vendor) ?? [];
      activities.push(activity);
      this.activities.set(activity.vendor, activities);
      this.activityCallbacks.forEach((callback) => callback(activity));
      return;
    }

    if (row.event === "vendor.connectionChanged") {
      assertConnectionPayload(row.payload);
      this.connections.set(row.payload.vendor, row.payload.state);
      const change: VendorConnectionChange = {
        vendor: row.payload.vendor,
        atMs: row.atMs,
        state: row.payload.state,
      };
      this.connectionCallbacks.forEach((callback) => callback(change));
      return;
    }

    assertRateLimitPayload(row.payload);
    const rateLimit: VendorRateLimit = {
      vendor: row.payload.vendor,
      atMs: row.atMs,
      retryAfterS: row.payload.retryAfterS,
    };
    this.rateLimitCallbacks.forEach((callback) => callback(rateLimit));
  }
}
