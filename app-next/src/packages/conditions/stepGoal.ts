export const REVIEW_STEP_GOAL = 20;
export const MIN_STANDARD_STEP_GOAL = 500;
export const MAX_STEP_GOAL = 30000;
export const STEP_GOAL_INCREMENT = 500;

export function isValidStepGoal(value: number): boolean {
  return Number.isFinite(value) && (
    value === REVIEW_STEP_GOAL ||
    (value >= MIN_STANDARD_STEP_GOAL &&
      value <= MAX_STEP_GOAL &&
      value % STEP_GOAL_INCREMENT === 0)
  );
}
