/**
 * Minute formatting for every Analysis surface. One place, so "1h 05m" never
 * appears next to "65 min" on the same screen.
 */

/** `0m` · `45m` · `1h` · `2h 5m`. Always the shortest true reading. */
export function formatMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/**
 * The Time Reclaimed hero's two pieces: the big rounded numeral and the unit
 * riding beside it (PRD §3.15 Tab 3 block 2). Whole hours once there is an hour
 * to show — the exact minutes belong on the line under it, not at 76pt.
 */
export function heroReading(minutes: number): { value: string; unit: string } {
  const whole = Math.max(0, Math.round(minutes));
  return whole < 60
    ? { value: String(whole), unit: "m" }
    : { value: String(Math.floor(whole / 60)), unit: "h" };
}

/** `+45m` · `−1h 10m`. The sign carries the meaning, so it is never dropped. */
export function formatSignedMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return "0m";
  return `${rounded > 0 ? "+" : "−"}${formatMinutes(Math.abs(rounded))}`;
}

/** `21 days` · `1 day` — a window's length in prose. */
export function formatDays(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

/** `5 of 7 days` — the active-days reading (PRD §3.13 recap row ②). */
export function formatDayCount(active: number, total: number): string {
  return `${active} of ${total} ${total === 1 ? "day" : "days"}`;
}
