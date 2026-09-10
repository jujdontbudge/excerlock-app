import { Rule } from '../../domain/types';
import { validateRule } from '../../domain/validateRule';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { assertScheduleRepresentable, type SchedulePlanContext } from '../../domain/scheduleRepresentability';
export function saveRule(rule: Rule, context?: SchedulePlanContext) {
  const issues = validateRule(rule);
  if (issues.length) throw new Error(issues.join(', '));
  const rules = rulesStore.getState().data.rules;
  const proposed = [...rules.filter((r) => r.id !== rule.id), rule];
  assertScheduleRepresentable(proposed, context);
  rulesStore.getState().patch({ rules: proposed });
}
export function toggleRule(id: string, enabled: boolean, context?: SchedulePlanContext) {
  const rules = rulesStore.getState().data.rules;
  const proposed = rules.map((r) => (r.id === id ? { ...r, enabled } : r));
  if (enabled) assertScheduleRepresentable(proposed, context);
  rulesStore.getState().patch({ rules: proposed });
}
export function deleteRule(id: string) {
  rulesStore.getState().patch({ rules: rulesStore.getState().data.rules.filter((r) => r.id !== id) });
  const { days } = ruleDaysStore.getState().data;
  ruleDaysStore.getState().patch({ days: days.filter((d) => d.ruleId !== id) });
}
