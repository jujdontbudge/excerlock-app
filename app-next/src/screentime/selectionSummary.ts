import type {
  ScreenTimeSelectionHandle,
  ScreenTimeSelectionSummary,
} from "./ScreenTimeModule";

/** What a selection holds. Counts are all FamilyControls exposes to us. */
export type SelectionContents = Readonly<{
  applicationCount: number;
  categoryCount: number;
}>;

export const DEFAULT_SELECTION_CONTENTS: SelectionContents = Object.freeze({
  applicationCount: 4,
  categoryCount: 2,
});

/**
 * Composes the one line a caller may show for a selection. Only an adapter runs
 * this: the string is built from counts, never from an identifier or app name.
 */
export function summarizeSelection(
  handle: ScreenTimeSelectionHandle,
  contents: SelectionContents,
): ScreenTimeSelectionSummary {
  const { applicationCount, categoryCount } = contents;
  const parts = [
    countLabel(applicationCount, "app", "apps"),
    countLabel(categoryCount, "category", "categories"),
  ].filter((part): part is string => part !== null);

  return Object.freeze({
    handle,
    displayName: parts.length === 0 ? "Nothing selected" : parts.join(" · "),
    applicationCount,
    categoryCount,
  });
}

function countLabel(count: number, one: string, many: string): string | null {
  if (count <= 0) {
    return null;
  }
  return `${count} ${count === 1 ? one : many}`;
}

export function readSelectionContents(value: unknown): SelectionContents | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const applicationCount = Reflect.get(value, "applicationCount");
  const categoryCount = Reflect.get(value, "categoryCount");
  return isCount(applicationCount) && isCount(categoryCount)
    ? { applicationCount, categoryCount }
    : null;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
