import { onboardingLabels } from '../../../content/onboarding';
export function impactSummary(minutes: number) {
  const hours = Math.max(0, Math.min(24, minutes / 60));
  const days = Math.round((hours * 365) / 24);
  const freeDays = Math.round((onboardingLabels.freeHours * 365) / 24);
  return { hours, month: hours * 30, days, freeDays, scrollingDots: Math.min(days, freeDays) };
}
export function dotState(index: number, step: string, summary: ReturnType<typeof impactSummary>) {
  const firstFree = 365 - summary.freeDays;
  return {
    visible: step === 'O12' || index >= firstFree,
    scrolling: step === 'O14' && index >= firstFree && index < firstFree + summary.scrollingDots,
    order: Math.max(0, index - firstFree),
  };
}
