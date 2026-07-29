import {
  TimelinePlayer,
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
import {
  VENDORS,
  VENDOR_FIXTURE_EVENTS,
  assertVendorActivityPayload,
  assertVendorConnectionPayload,
  assertVendorRateLimitPayload,
  validateVendorFixtureRow,
  type VendorFixtureEvent,
  type VendorFixtureManifest,
  type VendorFixturePayload,
} from "./fixtureManifest";

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
      validateRow: validateVendorFixtureRow,
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
      assertVendorActivityPayload(row.payload);
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
      assertVendorConnectionPayload(row.payload);
      this.connections.set(row.payload.vendor, row.payload.state);
      const change: VendorConnectionChange = {
        vendor: row.payload.vendor,
        atMs: row.atMs,
        state: row.payload.state,
      };
      this.connectionCallbacks.forEach((callback) => callback(change));
      return;
    }

    assertVendorRateLimitPayload(row.payload);
    const rateLimit: VendorRateLimit = {
      vendor: row.payload.vendor,
      atMs: row.atMs,
      retryAfterS: row.payload.retryAfterS,
    };
    this.rateLimitCallbacks.forEach((callback) => callback(rateLimit));
  }
}
