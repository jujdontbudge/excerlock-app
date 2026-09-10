import { dayKey } from '../../domain/calendar';
import { REVIEW_STEP_GOAL } from '../../domain/stepGoal';
import type { Answers } from '../../onboarding/types';

export const REVIEW_PRESET_NAME = 'App Review';
export function isReviewPresetName(name: unknown): boolean {
  return typeof name === 'string' && name.trim() === REVIEW_PRESET_NAME;
}

export function applyReviewPreset(
  answers: Answers,
  context: { enabled: boolean; now: string; timezone: string },
): Answers {
  if (!context.enabled || answers.reviewPresetApplied === true) return answers;
  const weekday = new Date(`${dayKey(context.now, context.timezone)}T12:00:00Z`).getUTCDay();
  return {
    ...answers,
    reviewPresetApplied: true,
    activity: 'walking',
    walkingMode: 'steps',
    stepGoal: REVIEW_STEP_GOAL,
    days: [weekday],
    allDay: true,
  };
}
