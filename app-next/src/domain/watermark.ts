const RESTORE_REWIND_MS = 26 * 60 * 60 * 1000;

export function effectiveNow(observed: string, watermark: string | null): string {
  if (!watermark) return observed;
  const rewind = Date.parse(watermark) - Date.parse(observed);
  if (rewind > RESTORE_REWIND_MS) return observed;
  return Date.parse(observed) > Date.parse(watermark) ? observed : watermark;
}

export function nextWatermark(observed: string, watermark: string | null): string {
  return effectiveNow(observed, watermark);
}
