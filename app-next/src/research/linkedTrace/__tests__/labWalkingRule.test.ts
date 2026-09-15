import { rulesStore } from '../../../state/rulesStore';
import type { Rule } from '../../../domain/types';
import {
  LAB_WALKING_RULE_ID,
  ensureLabWalkingRule,
  labWalkingRuleReady,
  removeLabWalkingRule,
} from '../labWalkingRule.research';

const operatorRule: Rule = {
  id: '11111111-2222-4333-8444-555555555555',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 6_000 },
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } },
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  rulesStore.getState().reset();
});

test('installs exactly the all-day walking-state rule the real ExcerLock path needs', () => {
  ensureLabWalkingRule();
  const rules = rulesStore.getState().data.rules;
  expect(rules).toHaveLength(1);
  const rule = rules[0]!;
  expect(rule.id).toBe(LAB_WALKING_RULE_ID);
  expect(rule.enabled).toBe(true);
  expect(rule.activity).toBe('walking');
  expect(rule.mode).toEqual({ kind: 'state', activity: 'walking' });
  expect(rule.schedule.window).toEqual({ kind: 'allDay' });
  expect([...rule.schedule.days].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(labWalkingRuleReady(rules)).toBe(true);
});

test('is idempotent and repairs a malformed lab rule instead of duplicating it', () => {
  ensureLabWalkingRule();
  ensureLabWalkingRule();
  expect(rulesStore.getState().data.rules).toHaveLength(1);

  rulesStore.getState().patch({ rules: [{ ...rulesStore.getState().data.rules[0]!, enabled: false }] });
  expect(labWalkingRuleReady(rulesStore.getState().data.rules)).toBe(false);
  ensureLabWalkingRule();
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  expect(labWalkingRuleReady(rulesStore.getState().data.rules)).toBe(true);
});

test('removes only the lab rule and leaves an operator rule untouched', () => {
  rulesStore.getState().patch({ rules: [operatorRule] });
  ensureLabWalkingRule();
  expect(rulesStore.getState().data.rules).toHaveLength(2);

  removeLabWalkingRule();
  const rules = rulesStore.getState().data.rules;
  expect(rules).toHaveLength(1);
  expect(rules[0]).toEqual(operatorRule);
  expect(labWalkingRuleReady(rules)).toBe(false);
});
