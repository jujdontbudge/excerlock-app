import {
  WEEKDAYS,
  type RecurringLockWindow,
  type Weekday,
} from "./recurringLockWindow";

const DAY_SHORT: Readonly<Record<Weekday, string>> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const DAY_PICKER_LABEL: Readonly<Record<Weekday, string>> = {
  monday: "M",
  tuesday: "T",
  wednesday: "W",
  thursday: "T",
  friday: "F",
  saturday: "S",
  sunday: "S",
};

export function formatWindowDays(days: readonly Weekday[]): string {
  return WEEKDAYS.filter((day) => days.includes(day))
    .map((day) => DAY_SHORT[day])
    .join(", ");
}

export function formatMinuteOfDay(minuteOfDay: number): string {
  const hours24 = Math.floor(minuteOfDay / 60);
  const minutes = String(minuteOfDay % 60).padStart(2, "0");
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${hours24 < 12 ? "AM" : "PM"}`;
}

export function formatTimeInput(minuteOfDay: number): string {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(
    minuteOfDay % 60,
  ).padStart(2, "0")}`;
}

export function parseTimeInput(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

export function formatWindowTime(window: RecurringLockWindow): string {
  const range = `${formatMinuteOfDay(window.startMinute)}–${formatMinuteOfDay(
    window.endMinute,
  )}`;
  return window.endMinute < window.startMinute
    ? `${range} · ends next day`
    : range;
}

export function windowActionName(
  action: "Edit" | "Delete",
  window: RecurringLockWindow,
): string {
  return `${action} ${formatWindowDays(window.days)} ${formatMinuteOfDay(
    window.startMinute,
  )}–${formatMinuteOfDay(window.endMinute)}`;
}

export function nextRecurringWindowId(
  windows: readonly RecurringLockWindow[],
): string {
  const ids = new Set(windows.map(({ id }) => id));
  let number = 1;
  while (ids.has(`window-${number}`)) {
    number += 1;
  }
  return `window-${number}`;
}
