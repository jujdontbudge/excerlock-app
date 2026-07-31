export const UNLOCK_INCREMENT_MS = 15 * 60_000;
export const UNLOCK_LEASE_MONITOR = "excerlock.unlock-lease.v1";

export type DeviceActivityDateComponents = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}>;

/** DeviceActivity schedules use the device's local calendar components. */
export function localDateComponents(atMs: number): DeviceActivityDateComponents {
  const date = new Date(atMs);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

/** Keeps caller-owned window ids out of DeviceActivity's public OS log names. */
export function monitorNameForLockWindow(id: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return `excerlock.lock-window.${hash.toString(36)}`;
}
