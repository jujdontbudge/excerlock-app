import type { PurchaseFailureClass } from '@excerlock/analytics-events';

export function adaptyErrorCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('adaptyCode' in error)) return null;
  return typeof error.adaptyCode === 'number' ? error.adaptyCode : null;
}

const network = new Set([7, 97, 99, 102, 112, 2004, 2005, 3101]);
const declined = new Set([3, 4, 1003]);
const unavailable = new Set([1, 5, 6, 8, 9, 10, 11, 12, 13, 14, 20, 22, 24, 98, 103, 105, 107, 108, 1000, 1002, 1004, 1005, 1010, 1011, 1020, 1030, 2002, 3005, 3006, 3007]);
const uncharged = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 22, 24, 98, 103, 105, 107, 108, 1000, 1002, 1003, 2002, 2003, 3001, 3005]);

export function purchaseFailureClass(error: unknown): PurchaseFailureClass {
  const code = adaptyErrorCode(error);
  if (code === 2) return 'cancelled';
  if (code !== null && network.has(code)) return 'network';
  if (code !== null && declined.has(code)) return 'declined';
  return code !== null && unavailable.has(code) ? 'unavailable' : 'unknown';
}

export function purchaseDefinitelyUncharged(error: unknown): boolean {
  const code = adaptyErrorCode(error);
  return code !== null && uncharged.has(code);
}
