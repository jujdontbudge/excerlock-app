import { tokens as t } from '../../ui/tokens';

export type PageDirection = -1 | 1;

export function shouldTurnPage(translationX: number, velocityX: number, travel: number): boolean {
  'worklet';
  const far = Math.abs(translationX) >= Math.max(t.control.full, travel / 4);
  const flung = Math.abs(velocityX) >= t.motion.velocity.dismiss && Math.sign(velocityX) === Math.sign(translationX);
  return far || flung;
}
