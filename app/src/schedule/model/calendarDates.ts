import { DAY_MS } from "@excerlock/ledger";

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a calendar field into the ledger's epoch-day index. UTC getters are
 * deliberate: ledger timestamps already represent local wall-clock time.
 */
export function parseCalendarDate(value: string): number | undefined {
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    return undefined;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.getTime() / DAY_MS;
}

/** Formats one ledger epoch-day as the stable `YYYY-MM-DD` calendar field. */
export function formatCalendarDate(dayIndex: number): string {
  const date = new Date(dayIndex * DAY_MS);
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
