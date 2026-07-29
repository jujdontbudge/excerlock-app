import type { EventSpecMap } from '../types'

/** The four Tier-1 direct vendor connections shipping in v1 (PRD §3.5c). */
export type Vendor = 'strava' | 'oura' | 'whoop' | 'polar'

/**
 * Vendor connection lifecycle — server-owned: VendorSync holds the OAuth
 * exchange, the token store, and the webhook receivers (ARCHITECTURE §2), so
 * the server is the authoritative emitter. `vendor_earn_recorded` is the
 * webhook-driven earn signal (PRD §10.1) — distinct from the client's
 * `earn_claimed`, which is the balance-credit truth.
 */
export const vendorEvents = {
  vendor_connected: { owner: 'server' },
  vendor_disconnected: { owner: 'server' },
  vendor_earn_recorded: { owner: 'server' },
} as const satisfies EventSpecMap

export interface VendorEventProps {
  vendor_connected: { vendor: Vendor }
  // Covers user disconnects and vendor-side deauth webhooks alike.
  vendor_disconnected: { vendor: Vendor }
  vendor_earn_recorded: { vendor: Vendor }
}
