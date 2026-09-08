import { Activity } from '../domain/types';
export const setupSteps = ['X1', 'X2', 'X3a', 'X3b', 'X4', 'X5'] as const;
export type SetupStep = (typeof setupSteps)[number];

export function setupPath(activity: Activity): SetupStep[] {
  return activity === 'gym' ? [...setupSteps] : ['X1', 'X2', 'X3b', 'X4', 'X5'];
}

export function nextSetup(step: string, activity: Activity): SetupStep | 'done' {
  const path = setupPath(activity);
  const index = path.indexOf(step as SetupStep);
  return path[index + 1] ?? 'done';
}

export function previousSetup(step: string, activity: Activity): SetupStep {
  const path = setupPath(activity);
  return path[Math.max(0, path.indexOf(step as SetupStep) - 1)];
}

export function resumeSetup(state: { setupStep: string; setupComplete: boolean }, activity: Activity) {
  const legacyStep = state.setupStep === 'X3' ? (activity === 'gym' ? 'X3a' : 'X3b') : state.setupStep;
  return state.setupComplete
    ? 'done'
    : setupPath(activity).includes(legacyStep as SetupStep)
      ? (legacyStep as SetupStep)
      : 'X1';
}
export function branchPermission(activity: Activity) {
  return activity === 'walking' ? 'motion' : activity === 'gym' ? 'location' : 'health';
}
