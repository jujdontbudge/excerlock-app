export const DOCK_BAR_HEIGHT = 49;
export const DOCK_ICON_SIZE = 26;
export const DOCK_ACTIVE_SCALE = 1.04;
export const DOCK_SAFE_AREA_MIN = 12;
/** Quitter inactive chrome is muted grey; selection is opacity, never a fill. */
export const DOCK_INACTIVE_OPACITY = 0.8;

/**
 * Content-only dissolve. The live background is never inside this mask.
 *
 * Geometry matches the fade-through-dock layering (and Quitter on device):
 * the 90pt ramp starts a little above the icon row, content is still ~54%
 * at the icon tops, and alpha reaches 0 at the icon-row bottom. The fully
 * hidden block is the home-indicator sliver only — never the icon row.
 */
export const CONTENT_FADE_LENGTH = 90;

/** Linear white → transparent. A convex early drop reads as a dead gap on the gradient. */
export const CONTENT_FADE_STOPS = [
  { alpha: 1, location: 0 },
  { alpha: 0, location: 1 },
] as const;

export type ContentFadeGeometry = {
  dockHeight: number;
  endFromScreenBottom: number;
  iconRowTopFromScreenBottom: number;
  startFromScreenBottom: number;
};

export function getDockSafeAreaHeight(safeAreaBottom: number) {
  return Math.max(safeAreaBottom, DOCK_SAFE_AREA_MIN);
}

export function getDockHeight(safeAreaBottom: number) {
  return DOCK_BAR_HEIGHT + getDockSafeAreaHeight(safeAreaBottom);
}

/** Fully hidden block below the fade: safe-area sliver only. Never DOCK_BAR_HEIGHT. */
export function getContentHiddenHeight(safeAreaBottom: number) {
  return getDockSafeAreaHeight(safeAreaBottom);
}

/** Linear alpha over the fade band; t = distance into band / length. */
export function getContentFadeAlpha(t: number) {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  return 1 - t;
}

export function getContentFadeGeometry(safeAreaBottom: number): ContentFadeGeometry {
  const hiddenHeight = getContentHiddenHeight(safeAreaBottom);

  return {
    dockHeight: getDockHeight(safeAreaBottom),
    endFromScreenBottom: hiddenHeight,
    iconRowTopFromScreenBottom: getDockHeight(safeAreaBottom),
    startFromScreenBottom: hiddenHeight + CONTENT_FADE_LENGTH,
  };
}
