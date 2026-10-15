export type Difficulty = 'easy' | 'medium' | 'hard';
export type OfferId = 'm15' | 'h1' | 'h3' | 'h6';
export type Offer = { id: OfferId; price: number; minutes: number };
export const economy = {
  easy: { stepsPerPoint: 20, pointsPerGymMinute: 8, walkingMinimum: 3000, gymMinimum: 20 },
  medium: { stepsPerPoint: 33, pointsPerGymMinute: 5, walkingMinimum: 6000, gymMinimum: 30 },
  hard: { stepsPerPoint: 60, pointsPerGymMinute: 3, walkingMinimum: 10000, gymMinimum: 45 },
} as const;
export const offers = [
  { id: 'm15', price: 25, minutes: 15 },
  { id: 'h1', price: 100, minutes: 60 },
  { id: 'h3', price: 250, minutes: 180 },
  { id: 'h6', price: 450, minutes: 360 },
] as const satisfies readonly Offer[];
export function dailyMinimum(activity: 'walking' | 'gym', difficulty: Difficulty): number {
  return activity === 'walking' ? economy[difficulty].walkingMinimum : economy[difficulty].gymMinimum;
}
