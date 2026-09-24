/** The promise card floats over the stage in screen points. */
export const promiseCard = { top: 70, height: 72 } as const;
/**
 * Scene rows in the 400-wide authored space: the map/phone columns start at the
 * top, and one card row sits under them (gym caption and timer) well above Continue.
 */
export const demoRows = { column: 0, columnHeight: 312, below: 324, belowHeight: 96 } as const;

export function sceneGeometry(width: number, height: number) {
  // Full-bleed stage: scale to the available width and start the scene under the
  // promise card; bottom-anchored figures keep standing on the ground line.
  const scale = Math.min(1.18, width / 400);
  const top = promiseCard.top + promiseCard.height + 12;
  return {
    scale,
    left: (width - 400 * scale) / 2,
    top,
    height: (height - top) / scale,
  };
}
