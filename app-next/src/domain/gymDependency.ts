import { Rule } from './types';
/**
 * A gym condition matches any saved gym (B24), so its only signal disappears
 * when the last gym does. These helpers are pure: they decide which rules the
 * gym list has just orphaned or restored, and never touch a store.
 */
export type GymPlaceRef = { id: string };
const isGym = (rule: Rule) => rule.activity === 'gym';
export function gymRulesToPause(rules: readonly Rule[], gymPlaces: readonly GymPlaceRef[]): Rule[] {
  if (gymPlaces.length) return [];
  return rules.filter((r) => isGym(r) && r.enabled);
}
export function gymRulesToResume(rules: readonly Rule[], gymPlaces: readonly GymPlaceRef[]): Rule[] {
  if (!gymPlaces.length) return [];
  return rules.filter((r) => isGym(r) && r.pausedReason === 'noGym');
}
/** The rule list after the gym list has been applied to it. Unchanged rules keep their identity. */
export function applyGymDependency(rules: readonly Rule[], gymPlaces: readonly GymPlaceRef[]): Rule[] {
  const pause = new Set(gymRulesToPause(rules, gymPlaces).map((r) => r.id));
  const resume = new Set(gymRulesToResume(rules, gymPlaces).map((r) => r.id));
  return rules.map((rule) => {
    if (pause.has(rule.id)) return { ...rule, enabled: false, pausedReason: 'noGym' as const };
    if (resume.has(rule.id)) {
      const { pausedReason: _reason, ...rest } = rule;
      return { ...rest, enabled: true };
    }
    return rule;
  });
}
