import type { EventSpecMap } from '../types'

export type Vendor = 'strava' | 'oura' | 'whoop' | 'polar'

export const vendorEvents = {
  vendor_connected: { owner: 'server' },
  vendor_disconnected: { owner: 'server' },
  vendor_earn_recorded: { owner: 'server' },
} as const satisfies EventSpecMap

export interface VendorEventProps {
  vendor_connected: { vendor: Vendor }
  vendor_disconnected: { vendor: Vendor }
  vendor_earn_recorded: { vendor: Vendor }
}
