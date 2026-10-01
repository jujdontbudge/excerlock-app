import type { AppliedPolicy } from './enforcementAnalytics';

export function isConditionShieldLift(previous: AppliedPolicy | null, next: AppliedPolicy): boolean {
  if (previous?.state !== 'shield') return false;
  if (next.state === 'open') return next.openReason === 'earned';
  return next.state === 'conditional' && next.relief === 'unlockedAtGym';
}
