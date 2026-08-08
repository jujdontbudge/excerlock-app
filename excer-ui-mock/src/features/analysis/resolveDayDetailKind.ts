import { heatMapFixture, heatMapLegend, type HeatCellKind } from '@/content';

type SearchParam = string | string[] | undefined;

const validKindOverrides = new Set<HeatCellKind>(
  heatMapLegend.map((entry) => entry.kind),
);

export function firstSearchParam(value: SearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolves the canonical sample state for a heat-map date. A valid `kind`
 * query parameter intentionally wins so `/analysis/day/...?...` can remain a
 * deterministic debug seam without changing the fixture.
 */
export function resolveDayDetailKind(
  dateParam: SearchParam,
  kindOverrideParam?: SearchParam,
): HeatCellKind {
  const kindOverride = firstSearchParam(kindOverrideParam);
  if (
    kindOverride &&
    validKindOverrides.has(kindOverride as HeatCellKind)
  ) {
    return kindOverride as HeatCellKind;
  }

  const date = firstSearchParam(dateParam);
  return heatMapFixture.find((cell) => cell.date === date)?.kind ?? 'blank';
}

/** Formats a route-owned ISO sample date without depending on the device locale. */
export function formatDayDetailDate(dateParam: SearchParam) {
  const date = firstSearchParam(dateParam);
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Sample day';

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== monthIndex ||
    candidate.getUTCDate() !== day
  ) return 'Sample day';

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
  return `${weekdays[candidate.getUTCDay()]}, ${months[monthIndex]} ${day}`;
}
