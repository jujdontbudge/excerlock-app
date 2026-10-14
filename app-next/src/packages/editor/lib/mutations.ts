import { assertBankExclusive } from '../../conditions/BankExclusivity';
import { removeBankCondition, syncBankCondition } from '../../bank/BankLifecycle';
import { Rule } from '../../model/types';
import { validateRule } from '../../conditions/validateRule';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { assertScheduleRepresentable, type SchedulePlanContext } from '../../schedule/scheduleRepresentability';
export function saveRule(rule: Rule, context?: SchedulePlanContext) {
  const issues = validateRule(rule);
  if (issues.length) throw new Error(issues.join(', '));
  const rules = rulesStore.getState().data.rules;
  if (rules.find((candidate) => candidate.id === rule.id)?.mode.kind !== 'bank' && rule.mode.kind === 'bank') rule = { ...rule, createdAt: context?.now ?? rule.updatedAt };
  const proposed = [...rules.filter((r) => r.id !== rule.id), rule];
  assertBankExclusive(proposed);
  assertScheduleRepresentable(proposed, context);
  rulesStore.getState().patch({ rules: proposed });
  if (context) syncBankCondition(context.now, context.timezone);
  return rules.some((r) => r.id === rule.id) ? 'edited' : 'created';
}
export function toggleRule(id: string, enabled: boolean, context?: SchedulePlanContext) {
  const rules = rulesStore.getState().data.rules;
  const proposed = rules.map((r) => (r.id === id ? { ...r, enabled } : r));
  if (enabled) assertScheduleRepresentable(proposed, context);
  rulesStore.getState().patch({ rules: proposed });
  if (context) syncBankCondition(context.now, context.timezone);
}
export function deleteRule(id: string) {
  rulesStore.getState().patch({ rules: rulesStore.getState().data.rules.filter((r) => r.id !== id) });
  removeBankCondition(id);
  const { days } = ruleDaysStore.getState().data;
  ruleDaysStore.getState().patch({ days: days.filter((d) => d.ruleId !== id) });
}
