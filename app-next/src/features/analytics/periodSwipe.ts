export const PERIOD_SWIPE_THRESHOLD = 56;

/** Positive translation reveals an older period from the left; negative returns toward today. */
export function offsetAfterPeriodSwipe(offset: number, translationX: number): number {
  if (translationX >= PERIOD_SWIPE_THRESHOLD) return offset - 1;
  if (translationX <= -PERIOD_SWIPE_THRESHOLD) return Math.min(0, offset + 1);
  return offset;
}
