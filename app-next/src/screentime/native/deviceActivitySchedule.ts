const WALK_INCREMENT_MINUTES = 15;

export const UNLOCK_INCREMENT_MS = WALK_INCREMENT_MINUTES * 60_000;
export const UNLOCK_LEASE_MONITOR = "excerlock.unlock-lease.v1";
export const BALANCE_DRAIN_MONITOR = "excerlock.balance-drain.v1";

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

export function localDaySchedule(atMs: number): Readonly<{
  intervalStart: DeviceActivityDateComponents;
  intervalEnd: DeviceActivityDateComponents;
  repeats: false;
}> {
  const start = new Date(atMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    intervalStart: localDateComponents(start.getTime()),
    intervalEnd: localDateComponents(end.getTime()),
    repeats: false,
  };
}

export function balanceRungEventName(index: number): string {
  return `excerlock.balance-rung.${index}`;
}

export function usageThresholdComponents(thresholdMinutes: number): Readonly<{
  minute: number;
  second: number;
}> {
  const totalSeconds = Math.round(thresholdMinutes * 60);
  return {
    minute: Math.floor(totalSeconds / 60),
    second: totalSeconds % 60,
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
