export const VENDORS = ["strava", "oura", "whoop", "polar"] as const;

export type Vendor = (typeof VENDORS)[number];

export function isVendor(value: string): value is Vendor {
  return VENDORS.includes(value as Vendor);
}
