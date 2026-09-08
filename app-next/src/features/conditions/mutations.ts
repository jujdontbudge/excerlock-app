import { Rule } from '../../domain/types';
import { validateRule } from '../../domain/validateRule';
import { applyGymDependency } from '../../domain/gymDependency';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { settingsStore } from '../../state/settingsStore';
import { dayKey } from '../../domain/schedule';
export function saveRule(rule: Rule) {
  const issues = validateRule(rule);
  if (issues.length) throw new Error(issues.join(', '));
  const rules = rulesStore.getState().data.rules;
  rulesStore.getState().patch({ rules: [...rules.filter((r) => r.id !== rule.id), rule] });
}
/**
 * Reconcile every gym condition with the saved-gym list (B25). Called after a
 * gym is saved or removed and after a gym condition is written, so the pause
 * and its reason are always a consequence of the list, never of a screen.
 */
export function syncGymDependency() {
  const { rules } = rulesStore.getState().data,
    gymPlaces = settingsStore.getState().data.gymPlaces;
  const next = applyGymDependency(rules, gymPlaces);
  if (next.some((rule, index) => rule !== rules[index])) rulesStore.getState().patch({ rules: next });
}
export function toggleRule(id: string, enabled: boolean) {
  rulesStore.getState().patch({
    rules: rulesStore.getState().data.rules.map((r) => {
      if (r.id !== id) return r;
      const { pausedReason: _reason, ...rest } = r;
      return enabled ? { ...rest, enabled } : { ...r, enabled };
    }),
  });
}
/** Deleting a condition drops its history but keeps an unlock already earned today (B23). */
export function deleteRule(
  id: string,
  now = new Date().toISOString(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  rulesStore.getState().patch({ rules: rulesStore.getState().data.rules.filter((r) => r.id !== id) });
  const { days, walkingSession } = ruleDaysStore.getState().data,
    today = dayKey(now, timezone);
  ruleDaysStore.getState().patch({
    days: days.filter((d) => d.ruleId !== id || (d.met && d.day === today)),
    walkingSession: walkingSession?.ruleId === id ? null : walkingSession,
  });
}
