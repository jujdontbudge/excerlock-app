export const WALKING_MINUTES_MIN = 10;
export const WALKING_MINUTES_MAX = 120;
export const WALKING_MINUTES_STEP = 5;
export const WALKING_MINUTES_DEFAULT = 20;

export function validWalkingMinutes(goal: unknown): goal is number {
  return (
    typeof goal === 'number' &&
    Number.isFinite(goal) &&
    goal >= WALKING_MINUTES_MIN &&
    goal <= WALKING_MINUTES_MAX &&
    goal % WALKING_MINUTES_STEP === 0
  );
}
