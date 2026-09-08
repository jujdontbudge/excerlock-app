import { WALK_INCREMENT_MS } from "../../../domain/sessions/lease";

export const UNLOCK_INCREMENT_MS = WALK_INCREMENT_MS;
export const UNLOCK_LEASE_MONITOR = "excerlock.unlock-lease.v1";
/** Reserved for the Analytics usage monitor (B15), armed by P2-T04. */
export const USAGE_MONITOR = "excerlock.usage.v1";

export type DeviceActivityDateComponents = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /**
   * Resolves the components in a named zone instead of the device's current one.
   * The usage monitor stamps it so a flight mid-day cannot move the day boundary
   * the Analytics counter is measured against.
   */
  timeZoneIdentifier?: string;
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

export function usageRungEventName(index: number): string {
  return `excerlock.usage-rung.${index}`;
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
