import { tokens as t } from '../../ui/tokens';

export const PERIOD_SWIPE_THRESHOLD = t.control.full;

export function offsetAfterPeriodSwipe(offset: number, translationX: number): number {
  if (translationX >= PERIOD_SWIPE_THRESHOLD) return offset - 1;
  if (translationX <= -PERIOD_SWIPE_THRESHOLD) return Math.min(0, offset + 1);
  return offset;
}
