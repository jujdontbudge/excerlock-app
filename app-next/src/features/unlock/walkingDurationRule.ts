import type { Rule } from '../../domain/types';

export type WalkingDurationRule = Omit<Rule, 'mode'> & {
  mode: {
    kind: 'target';
    activity: 'walking';
    metric: 'minutes';
    goal: number;
    place: 'outside' | 'treadmill' | 'either';
  };
};

// merge: replace this local shape with P2-T16's walking/minutes RuleMode variant.
export function walkingDurationRule(rule: Rule | undefined): WalkingDurationRule | null {
  if (!rule) return null;
  const candidate = rule as unknown as WalkingDurationRule;
  return candidate.mode.kind === 'target' &&
    candidate.mode.activity === 'walking' &&
    candidate.mode.metric === 'minutes'
    ? candidate
    : null;
}

export function isTreadmillCeremonyRule(rule: Rule | undefined): rule is Rule {
  if (!rule || !rule.enabled || rule.activity !== 'walking') return false;
  if (rule.mode.kind === 'state') return rule.mode.place === 'treadmill' || rule.mode.place === 'either';
  const duration = walkingDurationRule(rule);
  return duration?.mode.place === 'treadmill' || duration?.mode.place === 'either';
}
