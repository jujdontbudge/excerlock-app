import { Answers, FlowState } from './types';
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
  'O21',
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
export const tail = ['S1', 'S2', 'S3', 'S3b', 'S3c', 'S3d', 'P'] as const;

/**
 * A validated remote order for the two configurable groups (B8).
 *
 * The answer-driven branch in the middle (W/G) is never remote: it follows
 * from what the user answered. `preBranch`/`tail` may reorder and drop steps
 * within their own bundled sets; `pathFor` falls back to the bundled arrays
 * for any group the payload leaves out.
 */
export type FlowOrder = { readonly preBranch: readonly string[]; readonly tail: readonly string[] };

function branchFor(answers: Answers): string[] {
  switch (answers.activity) {
    case 'gym':
      return answers.gymMode === 'time' ? ['G0F', 'G0H', 'G1', 'G2'] : ['G0F', 'G0H', 'G1'];
    default:
      return answers.walkingMode === 'state' ? ['W0', 'W1', 'W2'] : ['W0', 'W1', 'W2', 'W3'];
  }
}

export function pathFor(answers: Answers, order?: FlowOrder | null): string[] {
  return [...(order?.preBranch ?? preBranch), ...branchFor(answers), ...(order?.tail ?? tail)];
}

/**
 * The remote rail only applies while it still contains the step the user is
 * standing on. A payload that dropped that step must not rewind (or loop) the
 * flow through `indexOf(-1)`, so that navigation keeps using the bundled order.
 */
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
  const state = persisted as Partial<FlowState>;
  if (typeof state.step !== 'string' || !state.answers) return 'O01';
  // The retired trial screens (T1–T4) sat right before the paywall, so an install saved there resumes at it.
  if (/^T[1-4]$/.test(state.step)) return 'P';
  const path = pathFor(state.answers, applicableOrder({ step: state.step, answers: state.answers }, order));
  return path.includes(state.step) ? state.step : path[0] ?? 'O01';
}
