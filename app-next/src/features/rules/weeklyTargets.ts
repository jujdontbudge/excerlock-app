import { Answers } from '../../onboarding/types';

/** Suggested goals, not forecasts. Half of reported screen time (capped at 10 hours). One extra 1,000-step walk per day or one gym session per week. */
export function weeklyTargets(answers: Answers) {
  const daily = Number(answers.estimatedDailyMinutes ?? 180);
  const screenHours = Math.min(10, Math.max(0, Math.round((Number.isFinite(daily) ? daily : 180) * 7 / 120)));
  if (answers.activity === 'gym') {
    const sessions = Number(answers.gymSessionsPerWeek);
    const hours = Number(answers.gymSessionHours);
    if (!Number.isFinite(sessions) || !Number.isFinite(hours)) return { screenHours, movement: null };
    return { screenHours, movement: { amount: hours, unit: `${hours === 1 ? 'hour' : 'hours'} more at the gym`, baseline: `${sessions * hours} → ${(sessions + 1) * hours} hours per week` } };
  }
  const steps = Number(answers.currentDailySteps);
  const dailyBand: Record<number, string> = {
    2500: '0–5,000', 7500: '5,000–10,000', 12500: '10,000–15,000',
    17500: '15,000–20,000', 20000: '20,000+',
  };
  return { screenHours, movement: Number.isFinite(steps) && dailyBand[steps] ? {
    amount: 7000, unit: 'more steps', baseline: `From your ${dailyBand[steps]} steps per day baseline`,
  } : null };
}
