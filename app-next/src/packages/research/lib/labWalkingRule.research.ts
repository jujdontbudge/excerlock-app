import type { Rule } from '../../model/types';
import { rulesStore } from '../../conditions/rulesStore';

export const LAB_WALKING_RULE_ID = 'f2c3a1b4-5d6e-4f70-8a91-2b3c4d5e6f70';

export function labWalkingRule(now: string = new Date().toISOString()): Rule {
  return {
    id: LAB_WALKING_RULE_ID,
    activity: 'walking',
    mode: { kind: 'state', activity: 'walking' },
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'allDay' } },
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function labWalkingRuleReady(rules: readonly Rule[]): boolean {
  const rule = rules.find((candidate) => candidate.id === LAB_WALKING_RULE_ID);
  return Boolean(
    rule &&
      rule.enabled &&
      rule.activity === 'walking' &&
      rule.mode.kind === 'state' &&
      rule.mode.activity === 'walking' &&
      rule.schedule.window.kind === 'allDay' &&
      rule.schedule.days.length === 7,
  );
}

export function ensureLabWalkingRule(): void {
  const { rules } = rulesStore.getState().data;
  if (labWalkingRuleReady(rules)) return;
  rulesStore.getState().patch({ rules: [...rules.filter((rule) => rule.id !== LAB_WALKING_RULE_ID), labWalkingRule()] });
}

export function removeLabWalkingRule(): void {
  const { rules } = rulesStore.getState().data;
  if (!rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)) return;
  rulesStore.getState().patch({ rules: rules.filter((rule) => rule.id !== LAB_WALKING_RULE_ID) });
}
