// Ported from packages/ledger/src/walk.ts. Keep the lease law local to app-next;
// Phase 2 adapters consume this module instead of importing the legacy package.
export const WALK_LEASE_MS = 15 * 60_000;

export type WalkLease = { startedAt: string; leaseUntil: string };

export function planWalkLease(at: string, leaseMs = WALK_LEASE_MS): WalkLease {
  return { startedAt: at, leaseUntil: new Date(Date.parse(at) + leaseMs).toISOString() };
}

export function isWalkLeaseLive(leaseUntil: string, at: string): boolean {
  return Date.parse(at) < Date.parse(leaseUntil);
}

export function renewWalkLease(leaseUntil: string, at: string, leaseMs = WALK_LEASE_MS): string | null {
  return isWalkLeaseLive(leaseUntil, at) ? new Date(Date.parse(at) + leaseMs).toISOString() : null;
}
