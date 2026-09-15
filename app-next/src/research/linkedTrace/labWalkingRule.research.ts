import type { Rule } from '../../domain/types';
import { rulesStore } from '../../state/rulesStore';

/**
 * The isolated lab's walking rule.
 *
 * Trace Lab cannot show ExcerLock's real block/release behavior with no rule:
 * production policy only lifts the shield while a verified walk is live. This
 * always-active walking-state rule runs the actual ExcerLock path (rules store →
 * runtime enforcement source → native policy) so the canary opens while walking
 * and is blocked again after standing still past the stop grace.
 *
 * The screen installs it as the test starts and removes it as soon as no trace
 * is running, so it is scoped to one test. It lives in the lab app's own
 * sandbox with the lab App Group, so it can never read or mutate production
 * ExcerLock rules, policy, or storage.
 */
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

/** True only for the exact rule shape the test needs: enabled, walking-state, all day. */
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

/** Installs the lab walking rule if it is missing or malformed; idempotent. */
export function ensureLabWalkingRule(): void {
  const { rules } = rulesStore.getState().data;
  if (labWalkingRuleReady(rules)) return;
  rulesStore.getState().patch({ rules: [...rules.filter((rule) => rule.id !== LAB_WALKING_RULE_ID), labWalkingRule()] });
}

/** Removes the lab walking rule; other (operator) rules are left untouched. */
export function removeLabWalkingRule(): void {
  const { rules } = rulesStore.getState().data;
  if (!rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)) return;
  rulesStore.getState().patch({ rules: rules.filter((rule) => rule.id !== LAB_WALKING_RULE_ID) });
}
