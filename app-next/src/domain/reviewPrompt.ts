import { addDays } from './calendar';
import { windowInstances } from './schedule';
import { streak, StreakDay } from './streak';
import { DayKey, Rule, RuleDay } from './types';

export type ReviewPromptState = {
  installedAt: string | null;
  promptCount: number;
  manualRateTapped: boolean;
};

export type ReviewFacts = { metDays: number; currentStreak: number };
export type ReviewStage = 'metDays' | 'streak7' | 'streak30';
export type ReviewPromptDecision = { show: false } | { show: true; stage: ReviewStage };

export const REVIEW_PROMPT_LIMIT = 3;
const MIN_INSTALL_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const STREAK_WINDOW_DAYS = 60;

/**
 * PRD §8's ordered rating policy, re-based on met days: the fifth met day once the install is three
 * days old, then the first 7-day streak, then a 30-day streak. Three prompts or a manual Rate tap end
 * it for good. Pure: the caller records the prompt it showed.
 */
export function reviewPromptDecision(state: ReviewPromptState, facts: ReviewFacts, now: string): ReviewPromptDecision {
  if (state.manualRateTapped || state.promptCount >= REVIEW_PROMPT_LIMIT || state.installedAt === null)
    return { show: false };
  if (state.promptCount === 0) {
    const old = Date.parse(now) - Date.parse(state.installedAt) >= MIN_INSTALL_AGE_MS;
    return facts.metDays >= 5 && old ? { show: true, stage: 'metDays' } : { show: false };
  }
  if (state.promptCount === 1) return facts.currentStreak >= 7 ? { show: true, stage: 'streak7' } : { show: false };
  return facts.currentStreak >= 30 ? { show: true, stage: 'streak30' } : { show: false };
}

/** The facts the policy reads, from the rule days the app already keeps. */
export function reviewFacts(rules: Rule[], ruleDays: RuleDay[], today: DayKey, timezone: string): ReviewFacts {
  const metDayKeys = new Set(ruleDays.filter((row) => row.met && row.day <= today).map((row) => row.day));
  const enabled = rules.filter((rule) => rule.enabled);
  const days: StreakDay[] = [];
  for (let offset = STREAK_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset);
    days.push({
      day,
      scheduled: enabled.some((rule) => windowInstances(rule, day, timezone).length > 0),
      met: metDayKeys.has(day),
    });
  }
  return { metDays: metDayKeys.size, currentStreak: streak(days, today).current };
}
