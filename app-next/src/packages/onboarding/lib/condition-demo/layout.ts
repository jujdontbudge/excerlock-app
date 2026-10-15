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
export const bankRows = {
  phoneHeight: 312,
  tallPhoneHeight: 368,
  phoneBottom: 120,
  captionHeight: 30,
  captionGap: 10,
  topRoom: 64,
  walker: { left: 4, bottom: 112, width: 190, height: 283, hand: { x: 0.76, y: 0.61 } },
} as const;
export function bankGeometry(height: number) {
  const room = height - bankRows.topRoom - bankRows.captionHeight - bankRows.captionGap - bankRows.phoneBottom;
  const phoneHeight = Math.max(bankRows.phoneHeight, Math.min(bankRows.tallPhoneHeight, room));
  const phoneTop = height - bankRows.phoneBottom - phoneHeight;
  const walkerScale = phoneHeight / bankRows.phoneHeight;
  const { walker } = bankRows;
  return {
    phoneTop,
    phoneHeight,
    shopOffset: (phoneHeight - bankRows.phoneHeight) / 2,
    captionTop: phoneTop - bankRows.captionGap - bankRows.captionHeight,
    walkerScale,
    walkerOrigin: `${walker.left}px ${height - walker.bottom}px`,
    hand: {
      x: walker.left + walker.width * walker.hand.x * walkerScale,
      y: height - walker.bottom - walker.height * walker.hand.y * walkerScale,
    },
  };
}
export const bankPhoneLayout = {
  pill: { top: 30, height: 28 },
  bank: { top: 70, height: 66, inset: 10 },
  grid: { top: 146, card: 72, height: 64, gap: 6 },
} as const;
