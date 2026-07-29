import type { JsonValue } from "../timeline";

export type Vendor = "strava" | "oura" | "whoop" | "polar";

export type VendorConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface VendorActivity {
  readonly vendor: Vendor;
  readonly atMs: number;
  readonly raw: JsonValue;
}

export interface VendorConnectionChange {
  readonly vendor: Vendor;
  readonly atMs: number;
  readonly state: VendorConnectionState;
}

export interface VendorRateLimit {
  readonly vendor: Vendor;
  readonly atMs: number;
  readonly retryAfterS: number;
}

export type VendorUnsubscribe = () => void;

export interface VendorProvider {
  fetchToday(vendor: Vendor): Promise<readonly VendorActivity[]>;
  getConnectionState(vendor: Vendor): VendorConnectionState;
  onActivityAvailable(
    callback: (activity: VendorActivity) => void,
  ): VendorUnsubscribe;
  onConnectionChange(
    callback: (change: VendorConnectionChange) => void,
  ): VendorUnsubscribe;
  onRateLimited(
    callback: (rateLimit: VendorRateLimit) => void,
  ): VendorUnsubscribe;
}
