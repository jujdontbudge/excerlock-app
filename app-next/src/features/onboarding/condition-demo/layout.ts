export const promiseCard = { top: 70, height: 72 } as const;
export const demoRows = { column: 0, columnHeight: 312, below: 324, belowHeight: 96 } as const;

export function sceneGeometry(width: number, height: number) {
  const scale = Math.min(1.18, width / 400);
  const top = promiseCard.top + promiseCard.height + 12;
  return {
    scale,
    left: (width - 400 * scale) / 2,
    top,
    height: (height - top) / scale,
  };
}
