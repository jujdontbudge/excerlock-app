export type Difficulty = 'easy' | 'medium' | 'hard';
export type OfferId = 'm15' | 'h1' | 'h3' | 'h6';
export type Offer = { id: OfferId; price: number; minutes: number };
export const pointsPerStep = 1;
export const pointsPerGymMinute = 165;
export const economy = {
  easy: { hourlyPrice: 2000, walkingMinimum: 3000, gymMinimum: 20 },
  medium: { hourlyPrice: 3300, walkingMinimum: 6000, gymMinimum: 30 },
  hard: { hourlyPrice: 6000, walkingMinimum: 10000, gymMinimum: 45 },
} as const;
const offerTerms = [
  { id: 'm15', multiplier: 0.25, minutes: 15 },
  { id: 'h1', multiplier: 1, minutes: 60 },
  { id: 'h3', multiplier: 2.5, minutes: 180 },
  { id: 'h6', multiplier: 4.5, minutes: 360 },
] as const;
export function offersFor(difficulty: Difficulty): readonly Offer[] {
  return offerTerms.map(({ id, multiplier, minutes }) => ({ id, price: economy[difficulty].hourlyPrice * multiplier, minutes }));
}
export function dailyMinimum(activity: 'walking' | 'gym', difficulty: Difficulty): number {
  return activity === 'walking' ? economy[difficulty].walkingMinimum : economy[difficulty].gymMinimum;
}
