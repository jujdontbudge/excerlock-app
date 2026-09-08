import { HistoryDay } from '../ports/models';
import { streak } from './streak';
import { DayKey } from './types';

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

/**
 * The facts the policy reads, from the sealed history. Rule days are pruned at 35 days, so counting
 * met days there would forget a milestone the user actually reached; history is the long record.
 */
export function reviewFacts(history: HistoryDay[], today: DayKey): ReviewFacts {
  return {
    metDays: history.filter((row) => row.met && row.day <= today).length,
    currentStreak: streak(history, today).current,
  };
}
