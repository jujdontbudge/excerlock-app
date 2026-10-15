import { economy, type Difficulty, type Offer } from '../model/bankEconomy';
export type BankView = {
  activity: 'walking' | 'gym';
  difficulty: Difficulty;
  points: number;
  pendingPoints: number;
  firstCollect: boolean;
  bankMinutes: number;
  today: { amount: number; minimum: number; met: boolean };
};
export function activityToGo(view: BankView, offer: Offer): number {
  const missing = Math.max(0, offer.price - view.points - view.pendingPoints);
  const rate = economy[view.difficulty];
  return view.activity === 'walking' ? missing * rate.stepsPerPoint : Math.ceil(missing / rate.pointsPerGymMinute);
}
