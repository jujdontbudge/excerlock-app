export function formatConfessedDailyUsage(minutes: number | null): string {
  if (minutes === null) {
    return "your phone time";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return remainingMinutes === 0
    ? hourLabel
    : `${hourLabel} ${remainingMinutes} minutes`;
}
