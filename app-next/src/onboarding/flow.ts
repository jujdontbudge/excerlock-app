import { Answers, FlowState } from './types';
export const preBranch = [
  'O01',
  'O02',
  'O03',
  'O04',
  'O05',
  'O06',
  'O08',
  'O09',
  'O10',
  'O11',
  'O12',
  'O13',
  'O14',
  'O15',
  'O16',
  'O17',
  'O18',
  'O20',
] as const;
export const tail = ['S1', 'S2', 'S3', 'S4', 'T1', 'T2', 'T3', 'T4', 'P'] as const;
export function pathFor(answers: Answers): string[] {
  let branch: string[];
  switch (answers.activity) {
    case 'gym':
      branch = answers.gymMode === 'arrival' ? ['G1'] : ['G1', 'G2'];
      break;
    case 'running':
      branch = ['R1', answers.runMode === 'distance' ? 'D' : 'R2'];
      break;
    case 'biking':
      branch = ['B1', answers.bikeMode === 'distance' ? 'D' : 'B2'];
      break;
    default:
      branch = answers.walkingMode === 'state' ? ['W1', 'W2'] : ['W1', 'W2', 'W3'];
  }
  return [...preBranch, ...branch, ...tail];
}
export function nextStep(state: FlowState): string {
  const path = pathFor(state.answers);
  return path[Math.min(path.indexOf(state.step) + 1, path.length - 1)];
}
export function prevStep(state: FlowState): string {
  const path = pathFor(state.answers);
  return path[Math.max(0, path.indexOf(state.step) - 1)];
}
export function progressFraction(state: FlowState): number {
  const path = pathFor(state.answers);
  return Math.max(0, path.indexOf(state.step)) / (path.length - 1);
}
export function resumeStep(persisted: unknown): string {
  if (typeof persisted !== 'object' || persisted === null) return 'O01';
  const state = persisted as Partial<FlowState>;
  return typeof state.step === 'string' && state.answers && pathFor(state.answers).includes(state.step)
    ? state.step
    : 'O01';
}
