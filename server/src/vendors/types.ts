export const VENDORS = ["strava", "oura", "whoop", "polar"] as const;

export type Vendor = (typeof VENDORS)[number];
