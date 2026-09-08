/**
 * The walking lease. Ported from `packages/ledger/src/walk.ts` (`planWalkIncrement`,
 * `isWalkWindowActive`, `extendWalkIncrement`) per the P2-T15 §2 amendment: the ledger is retired
 * with the balance economy, but these three functions are the lease law and survive it unchanged.
 * The package is not imported; Phase 2 adapters and the native engine consume this module.
 */

/**
 * App-fixed unlock increment (PRD §3.5b): Apple's 15-minute DeviceActivity minimum, used as-is.
 * Not user-set, because letting people raise it would let them pick their own exploit size. The
 * OS-side schedule re-shields when a lease lapses, so force-quitting mid-session costs one lease.
 */
export const WALK_LEASE_MS = 15 * 60_000;

export type WalkLease = { startedAt: string; leaseUntil: string };

export function planWalkLease(at: string, leaseMs = WALK_LEASE_MS): WalkLease {
  return { startedAt: at, leaseUntil: new Date(Date.parse(at) + leaseMs).toISOString() };
}

/** Half-open: the lease is live until `leaseUntil` and lapsed exactly at it. */
export function isWalkLeaseLive(leaseUntil: string, at: string): boolean {
  return Date.parse(at) < Date.parse(leaseUntil);
}

/**
 * A walking re-verification renews the lease to one increment from the re-verify moment. A lapsed
 * lease is never extended: the session is over and only an explicit fresh start reopens access.
 * This is why the port has no `renew()` — a `verified` event renews, nothing else.
 */
export function renewWalkLease(leaseUntil: string, at: string, leaseMs = WALK_LEASE_MS): string | null {
  return isWalkLeaseLive(leaseUntil, at) ? new Date(Date.parse(at) + leaseMs).toISOString() : null;
}
