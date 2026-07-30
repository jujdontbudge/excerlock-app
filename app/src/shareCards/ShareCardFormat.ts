export type ShareCardRatio = "story" | "feed";

export type ShareCardFormat = Readonly<{
  width: number;
  height: number;
  aspectRatio: number;
}>;

/** Export geometry is data from PRD §3.13, not sampled from the preview size. */
export const SHARE_CARD_FORMATS: Readonly<Record<ShareCardRatio, ShareCardFormat>> =
  Object.freeze({
    story: Object.freeze({ width: 1_080, height: 1_920, aspectRatio: 9 / 16 }),
    feed: Object.freeze({ width: 1_080, height: 1_080, aspectRatio: 1 }),
  });
