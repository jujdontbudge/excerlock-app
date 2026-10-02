import { Answers, bodyGoals, FlowState } from '../../model/answers';

import type { FlowOrder } from '../../ports/OnboardingFlowPort';
export const preBranch = [
  'O01',
  'O02',
  'O03',
  'O07',
  'O04',
  'O05',
  'O06',
  'O08',
  'O22',
  'O23',
  'O24',
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
export const tail = ['S1', 'S2', 'S3', 'S4', 'S5', 'S3b', 'S3c', 'S3d', 'P'] as const;
export type { FlowOrder };

function branchFor(answers: Answers): string[] {
  switch (answers.activity) {
    case 'gym':
      return answers.gymMode === 'time' ? ['G0F', 'G0H', 'G1', 'G2'] : ['G0F', 'G0H', 'G1'];
    default:
      return answers.walkingMode === 'state' ? ['W0', 'W1', 'W2'] : ['W0', 'W1', 'W2', 'W3'];
  }
}

function applies(step: string, answers: Answers): boolean {
  if (step === 'O23') return bodyGoals(answers).includes('gain');
  if (step === 'O24') return bodyGoals(answers).includes('lose');
  return true;
}

export function pathFor(answers: Answers, order?: FlowOrder | null): string[] {
  const pre = (order?.preBranch ?? preBranch)
    .filter((step) => step !== 'O23' && step !== 'O24')
    .flatMap((step) => step === 'O22' ? [step, ...(['O23', 'O24'].filter((target) => applies(target, answers)))] : [step]);
  const orderedTail = (order?.tail ?? tail).filter((step) => step !== 'S4' && step !== 'S5')
    .flatMap((step) => step === 'S3' ? [step, 'S4', 'S5'] : [step]);
  return [...pre, ...branchFor(answers), ...orderedTail];
}

function applicableOrder(state: FlowState, order?: FlowOrder | null): FlowOrder | null {
  if (!order) return null;
  return pathFor(state.answers, order).includes(state.step) ? order : null;
}

export function nextStep(state: FlowState, order?: FlowOrder | null): string {
  const path = pathFor(state.answers, applicableOrder(state, order));
  return path[Math.min(path.indexOf(state.step) + 1, path.length - 1)];
}
export function prevStep(state: FlowState, order?: FlowOrder | null): string {
  const path = pathFor(state.answers, applicableOrder(state, order));
  return path[Math.max(0, path.indexOf(state.step) - 1)];
}
export function progressFraction(state: FlowState, order?: FlowOrder | null): number {
  const path = pathFor(state.answers, applicableOrder(state, order));
  return Math.max(0, path.indexOf(state.step)) / (path.length - 1);
}
export function resumeStep(persisted: unknown, order?: FlowOrder | null): string {
  if (typeof persisted !== 'object' || persisted === null) return 'O01';
  const state = persisted as Partial<FlowState> & { completedSteps?: string[]; seenSteps?: string[] };
  if (!state.answers) return 'O01';
  const path = pathFor(state.answers, order);
  const completed = new Set(state.completedSteps ?? []);

  if (completed.size === 0 && typeof state.step === 'string') {
    const index = path.indexOf(state.step);
    const answered = path.reduce((last, step, position) => answeredStep(step, state.answers!) ? position : last, -1);
    path.slice(0, index >= 0 ? index : answered + 1).forEach((step) => completed.add(step));
  }
  return path.find((step) => !completed.has(step) || (answerStepHasKey(step) && !answeredStep(step, state.answers!))) ?? 'P';
}

export function answeredStep(step: string, answers: Answers): boolean {
  const keys: Record<string, string> = {
    O04: 'name', O05: 'referralSource', O06: 'ageBand', O07: 'gender', O08: 'improveFirst',
    O10: 'estimatedDailyMinutes', O20: 'activity', O22: 'bodyGoal', O23: 'muscleGainLb', O24: 'fatLossLb',
    W0: 'currentDailySteps', W1: 'walkPlaces', W2: 'walkingMode', W3: answers.walkingMode === 'minutes' ? 'walkMinutes' : 'stepGoal',
    G0F: 'gymSessionsPerWeek', G0H: 'gymSessionHours', G1: 'gymMode', G2: 'gymMinutes',
  };
  const key = keys[step];
  return key !== undefined && answers[key] !== undefined && answers[key] !== '';
}


function answerStepHasKey(step: string): boolean {
  return ['O04', 'O05', 'O06', 'O07', 'O08', 'O10', 'O20', 'O22', 'O23', 'O24', 'W0', 'W1', 'W2', 'W3', 'G0F', 'G0H', 'G1', 'G2'].includes(step);
}
