import type { Rule, RuleMode } from '../../domain/types';

export type WalkingDurationMode = Extract<RuleMode, { activity: 'walking'; metric: 'minutes' }>;
export type WalkingDurationRule = Omit<Rule, 'mode'> & { mode: WalkingDurationMode };

function isWalkingDurationRule(rule: Rule): rule is WalkingDurationRule {
  const mode = rule.mode;
  return mode.kind === 'target' && mode.activity === 'walking' && mode.metric === 'minutes';
}

/**
 * The treadmill ceremony books minutes, so it only accepts a walking rule with a minutes goal.
 * The rule itself is returned, never a copy: the screen keeps it in render dependencies.
 */
export function walkingDurationRule(rule: Rule | undefined): WalkingDurationRule | null {
  return rule && isWalkingDurationRule(rule) ? rule : null;
}

export function isTreadmillCeremonyRule(rule: Rule | undefined): rule is Rule {
  if (!rule || !rule.enabled || rule.activity !== 'walking') return false;
  if (rule.mode.kind === 'state') return rule.mode.place === 'treadmill' || rule.mode.place === 'either';
  const duration = walkingDurationRule(rule);
  return duration?.mode.place === 'treadmill' || duration?.mode.place === 'either';
}
