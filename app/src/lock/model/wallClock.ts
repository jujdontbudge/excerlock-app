/**
 * Lock windows are local wall-clock milliseconds (the ScreenTime boundary's
 * first invariant), so the offset has already been folded in. Reading them back
 * with UTC getters is what keeps "10:00 PM" the same string on every device.
 */
export function formatWallClockTime(atMs: number): string {
  const date = new Date(atMs);
  const hours24 = date.getUTCHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours12}:${minutes} ${hours24 < 12 ? "AM" : "PM"}`;
}
