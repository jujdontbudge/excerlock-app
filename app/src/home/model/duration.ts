import type { PickerUnit } from "@excerlock/condition-model";

/**
 * Every number Home shows is written here. No component formats time or a
 * metric on its own, so "2h 14m" and "6,240 steps" read identically wherever
 * they appear.
 */

const UNIT_LABELS: Readonly<Record<PickerUnit, string>> = {
  step: "steps",
  kilometer: "km",
  mile: "mi",
  meter: "m",
  yard: "yd",
  kilocalorie: "kcal",
  minute: "min",
  strain: "strain",
};

/** Only `step` reads as a count of things, so it is the only unit that inflects. */
const SINGULAR_LABELS: Partial<Readonly<Record<PickerUnit, string>>> = {
  step: "step",
};

function wholeMinutes(minutes: number): number {
  return Math.max(0, Math.floor(minutes));
}

/** `2h 14m` · `45m` · `Unlimited` for an unset allowance. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) {
    return "Unlimited";
  }

  const total = wholeMinutes(minutes);
  const hours = Math.floor(total / 60);
  return hours === 0 ? `${total}m` : `${hours}h ${total % 60}m`;
}

export interface HeroBalance {
  /** The big SF Rounded numeral. */
  readonly value: string;
  /** The small suffix riding beside it. */
  readonly unit: string;
}

/**
 * The lock hero's numeral. Under an hour it is a plain minute count; past that
 * it becomes a clock face, because `1h 32m` cannot be read at 76pt on one line.
 */
export function heroBalance(minutes: number): HeroBalance {
  if (!Number.isFinite(minutes)) {
    return { value: "∞", unit: "no limit set" };
  }

  const total = wholeMinutes(minutes);
  if (total < 60) {
    return { value: `${total}`, unit: "min left" };
  }

  const hours = Math.floor(total / 60);
  return {
    value: `${hours}:${String(total % 60).padStart(2, "0")}`,
    unit: "hrs left",
  };
}

/** Thousands-grouped integer — metric totals never render raw. */
export function formatCount(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** `6,240 steps` · `2.5 km` — a metric value with its picker unit. */
export function formatQuantity(value: number, unit: PickerUnit): string {
  const label =
    value === 1 ? (SINGULAR_LABELS[unit] ?? UNIT_LABELS[unit]) : UNIT_LABELS[unit];
  const isWhole = Number.isInteger(value);
  const amount = isWhole ? formatCount(value) : value.toFixed(1);
  return `${amount} ${label}`;
}
