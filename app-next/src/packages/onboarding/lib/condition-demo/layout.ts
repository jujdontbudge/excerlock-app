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
export const bankRows = { phoneHeight: 312, phoneBottom: 120, captionHeight: 30, captionGap: 10 } as const;
export function bankGeometry(height: number) {
  const phoneTop = height - bankRows.phoneBottom - bankRows.phoneHeight;
  return { phoneTop, captionTop: phoneTop - bankRows.captionGap - bankRows.captionHeight };
}
export const bankPhoneLayout = {
  pill: { top: 30, height: 28 },
  bank: { top: 70, height: 66, inset: 10 },
  grid: { top: 146, card: 72, height: 64, gap: 6 },
} as const;
