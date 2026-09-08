/**
 * The device's formatting preferences: language tag, 12/24-hour clock and first day of the week.
 * Read lazily from Intl so the app follows the device without a native module; tests pin a fixture
 * with `setLocaleForTests` so copy expectations stay deterministic.
 */
/** Sunday, Monday or Saturday, as CLDR defines first days. */
export type WeekStart = 0 | 1 | 6;
export type LocaleInfo = { tag: string; hour12: boolean; weekStart: WeekStart };
let override: Partial<LocaleInfo> | null = null;
let cached: LocaleInfo | null = null;
export function setLocaleForTests(next: Partial<LocaleInfo> | null) {
  override = next;
  cached = null;
}
export function deviceLocale(): LocaleInfo {
  if (!cached) {
    const tag = override?.tag ?? detectTag();
    cached = {
      tag,
      hour12: override?.hour12 ?? detectHour12(tag),
      weekStart: override?.weekStart ?? detectWeekStart(tag),
    };
  }
  return cached;
}
/** Day numbers (Sunday = 0) in the order the device lays out a week. */
export function weekOrder(weekStart: WeekStart = deviceLocale().weekStart): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(deviceLocale().tag, options).format(value);
}
export function formatDate(instant: string | Date, options: Intl.DateTimeFormatOptions): string {
  const { tag, hour12 } = deviceLocale();
  const timed = options.hour !== undefined || options.minute !== undefined;
  return new Intl.DateTimeFormat(tag, timed ? { hour12, ...options } : options).format(
    typeof instant === 'string' ? new Date(instant) : instant,
  );
}
function detectTag(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}
function detectHour12(tag: string): boolean {
  try {
    const sample = new Intl.DateTimeFormat(tag, { hour: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2000, 0, 1, 13)),
    );
    return !/13/.test(sample);
  } catch {
    return true;
  }
}
/** CLDR regions whose week starts on Sunday or Saturday; everything else defaults to Monday. */
const sundayRegions = new Set([
  'AG', 'AS', 'AU', 'BD', 'BR', 'BS', 'BT', 'BW', 'BZ', 'CA', 'CN', 'CO', 'DM', 'DO', 'ET', 'GT', 'GU', 'HK',
  'HN', 'ID', 'IL', 'IN', 'JM', 'JP', 'KE', 'KH', 'KR', 'LA', 'MH', 'MM', 'MO', 'MT', 'MX', 'MZ', 'NI', 'NP',
  'PA', 'PE', 'PH', 'PK', 'PR', 'PT', 'PY', 'SA', 'SG', 'SV', 'TH', 'TT', 'TW', 'UM', 'US', 'VE', 'VI', 'WS',
  'YE', 'ZA', 'ZW',
]);
const saturdayRegions = new Set(['AE', 'BH', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SD', 'SY']);
function detectWeekStart(tag: string): WeekStart {
  try {
    const locale = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info && Number.isFinite(info.firstDay)) return info.firstDay === 7 ? 0 : info.firstDay === 6 ? 6 : 1;
    const region = locale.maximize().region ?? '';
    return sundayRegions.has(region) ? 0 : saturdayRegions.has(region) ? 6 : 1;
  } catch {
    return 1;
  }
}
