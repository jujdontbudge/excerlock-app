export function reclaimedDay(baseline: number, usage: number | null): number | null {
  return usage === null ? null : Math.max(0, baseline - usage);
}
export function reclaimedPeriod(baseline: number, usage: (number | null)[]): { minutes: number; measuredDays: number } {
  const measured = usage.filter((value): value is number => value !== null);
  return {
    minutes: measured.reduce((sum, value) => sum + reclaimedDay(baseline, value)!, 0),
    measuredDays: measured.length,
  };
}
