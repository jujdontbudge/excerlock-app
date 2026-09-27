export type Answers = Record<string, string | number | boolean | number[] | string[]>;
export type FlowState = { step: string; answers: Answers };
export type BodyGoal = 'gain' | 'lose' | 'maintain';
const bodyGoalOrder: readonly BodyGoal[] = ['gain', 'lose', 'maintain'];
export function bodyGoals(answers: Answers): BodyGoal[] {
  const value = answers.bodyGoal;
  const picked: unknown[] = Array.isArray(value) ? value : [value];
  return bodyGoalOrder.filter((goal) => picked.includes(goal));
}
