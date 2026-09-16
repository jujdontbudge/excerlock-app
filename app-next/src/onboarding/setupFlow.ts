import { Activity } from '../domain/types';
/** X1 (Screen Time primer) and X2 (choose apps) are gone; X3 is only the gym picker for gym users. */
export const setupSteps = ['X3', 'X4', 'X5'] as const;
export function firstSetup(activity: Activity) {
  return activity === 'gym' ? 'X3' : 'X4';
}
export function nextSetup(step: string): (typeof setupSteps)[number] | 'done' {
  const index = setupSteps.indexOf(step as (typeof setupSteps)[number]);
  return setupSteps[index + 1] ?? 'done';
}
export function resumeSetup(state: { setupStep: string; setupComplete: boolean }, activity: Activity = 'walking') {
  const first = firstSetup(activity);
  return state.setupComplete
    ? 'done'
    : setupSteps.includes(state.setupStep as (typeof setupSteps)[number]) &&
        (state.setupStep !== 'X3' || activity === 'gym')
      ? state.setupStep
      : first;
}
export function branchPermission(activity: Activity) {
  return activity === 'walking' ? 'motion' : 'location';
}
