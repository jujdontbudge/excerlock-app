import type { Rule } from '../../../domain/types';
import { SchedulePlanError } from '../../../domain/scheduleRepresentability';
import { rulesStore } from '../../../state/rulesStore';
import { deleteRule, saveRule, toggleRule } from '../mutations';

const context = { now: '2026-09-06T12:00:00.000Z', timezone: 'UTC' };
const makeRule = (id: string, startMinute: number, enabled = true): Rule => ({
  id,
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
  schedule: { days: [1], window: { kind: 'range', startMinute, endMinute: startMinute + 30 } },
  enabled,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

beforeEach(() => rulesStore.getState().reset());

test('save rejects an eighth exact window atomically', () => {
  const existing = Array.from({ length: 7 }, (_, index) => makeRule(`rule-${index}`, index * 60));
  rulesStore.getState().patch({ rules: existing });

  expect(() => saveRule(makeRule('eighth', 7 * 60), context)).toThrow(SchedulePlanError);
  expect(rulesStore.getState().data.rules).toEqual(existing);
});

test('overlapping rules whose exact union remains within the limit are accepted', () => {
  const existing = Array.from({ length: 7 }, (_, index) => makeRule(`rule-${index}`, index * 60));
  rulesStore.getState().patch({ rules: existing });

  expect(() => saveRule(makeRule('overlap', 0), context)).not.toThrow();
  expect(rulesStore.getState().data.rules).toHaveLength(8);
});

test('enabling an eighth window is rejected without changing the store', () => {
  const rules = [
    ...Array.from({ length: 7 }, (_, index) => makeRule(`rule-${index}`, index * 60)),
    makeRule('eighth', 7 * 60, false),
  ];
  rulesStore.getState().patch({ rules });

  expect(() => toggleRule('eighth', true, context)).toThrow(SchedulePlanError);
  expect(rulesStore.getState().data.rules).toEqual(rules);
});

test('disabling and deleting remain available for recovery from an unsupported set', () => {
  rulesStore
    .getState()
    .patch({ rules: Array.from({ length: 8 }, (_, index) => makeRule(`rule-${index}`, index * 60)) });

  expect(() => toggleRule('rule-7', false, context)).not.toThrow();
  expect(rulesStore.getState().data.rules.find((rule) => rule.id === 'rule-7')?.enabled).toBe(false);
  expect(() => deleteRule('rule-6')).not.toThrow();
  expect(rulesStore.getState().data.rules.some((rule) => rule.id === 'rule-6')).toBe(false);
});
