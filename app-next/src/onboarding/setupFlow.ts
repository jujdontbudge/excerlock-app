import { Activity } from '../domain/types';
export const setupSteps = ['X1', 'X2', 'X3', 'X4', 'X5'] as const;
export function nextSetup(step: string): (typeof setupSteps)[number] | 'done' {
  const index = setupSteps.indexOf(step as (typeof setupSteps)[number]);
  return setupSteps[index + 1] ?? 'done';
}
export function resumeSetup(state: { setupStep: string; setupComplete: boolean }) {
  return state.setupComplete
    ? 'done'
    : setupSteps.includes(state.setupStep as (typeof setupSteps)[number])
      ? state.setupStep
      : 'X1';
}
export function branchPermission(activity: Activity) {
  return activity === 'walking' ? 'motion' : activity === 'gym' ? 'location' : 'health';
}
