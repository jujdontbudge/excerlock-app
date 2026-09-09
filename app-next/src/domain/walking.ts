/** Engine constants for Walk & Scroll verification (PRD §3.5b): app-fixed, never user-set. */
export const WALK_VERIFY_MS = 10000; // sustained walking cadence before a session unlocks
export const WALK_LEASE_MS = 900000; // Apple's 15-minute renewable lease, renewed while cadence holds
