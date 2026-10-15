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
  tallPhoneHeight: 420,
  walkerMaxScale: 1.12,
  stageWidth: 400,
  phoneBottom: 120,
  captionHeight: 30,
  captionGap: 10,
  topRoom: 20,
  walker: { left: 4, bottom: 112, width: 190, height: 283, hand: { x: 0.76, y: 0.61 } },
} as const;
export function bankGeometry(height: number) {
  const room = height - bankRows.topRoom - bankRows.captionHeight - bankRows.captionGap - bankRows.phoneBottom;
  const phoneHeight = Math.max(bankRows.phoneHeight, Math.min(bankRows.tallPhoneHeight, room));
  const phoneTop = height - bankRows.phoneBottom - phoneHeight;
  const walkerScale = Math.min(bankRows.walkerMaxScale, phoneHeight / bankRows.phoneHeight);
  const { walker } = bankRows;
  const origin = { x: walker.left, y: height - walker.bottom };
  const shift = 1 - walkerScale;
  return {
    phoneTop,
    phoneHeight,
    captionTop: phoneTop - bankRows.captionGap - bankRows.captionHeight,
    walkerScale,
    walkerTransform: [
      { translateX: shift * (origin.x - bankRows.stageWidth / 2) },
      { translateY: shift * (origin.y - height / 2) },
      { scale: walkerScale },
    ],
    hand: {
      x: origin.x + walker.width * walker.hand.x * walkerScale,
      y: origin.y - walker.height * walker.hand.y * walkerScale,
    },
  };
}
export const bankPhoneLayout = {
  header: { top: 28, height: 22, inset: 8 },
  chip: { width: 54, glyph: 14, pad: 4 },
  hero: { top: 64, height: 30, token: 24, gap: 5, number: 56 },
  caption: { top: 94 },
  grid: { top: 126, card: 72, height: 64, gap: 6, inset: 10 },
  stream: { count: 12, reach: 26 },
} as const;
export const bankPhoneWidth = 170;
export const bankChipGlyph = {
  x: bankPhoneWidth - bankPhoneLayout.header.inset - bankPhoneLayout.chip.width + bankPhoneLayout.chip.pad + bankPhoneLayout.chip.glyph / 2,
  y: bankPhoneLayout.header.top + bankPhoneLayout.header.height / 2,
};
export const bankHeroToken = {
  x:
    (bankPhoneWidth - bankPhoneLayout.hero.token - bankPhoneLayout.hero.gap - bankPhoneLayout.hero.number) / 2 +
    bankPhoneLayout.hero.token / 2,
  y: bankPhoneLayout.hero.top + bankPhoneLayout.hero.height / 2,
};
