import { Rule } from '../../domain/types';
import { validateRule } from '../../domain/validateRule';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
export function saveRule(rule: Rule) {
  const issues = validateRule(rule);
  if (issues.length) throw new Error(issues.join(', '));
  const rules = rulesStore.getState().data.rules;
  rulesStore.getState().patch({ rules: [...rules.filter((r) => r.id !== rule.id), rule] });
}
export function toggleRule(id: string, enabled: boolean) {
  rulesStore
    .getState()
    .patch({ rules: rulesStore.getState().data.rules.map((r) => (r.id === id ? { ...r, enabled } : r)) });
}
export function deleteRule(id: string) {
  rulesStore.getState().patch({ rules: rulesStore.getState().data.rules.filter((r) => r.id !== id) });
  const { days, walkingSession } = ruleDaysStore.getState().data;
  ruleDaysStore.getState().patch({
    days: days.filter((d) => d.ruleId !== id),
    walkingSession: walkingSession?.ruleId === id ? null : walkingSession,
  });
}
