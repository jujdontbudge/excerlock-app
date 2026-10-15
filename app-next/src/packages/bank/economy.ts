import { pointsPerGymMinute, type Difficulty, type Offer } from '../model/bankEconomy';
export type BankView = {
  activity: 'walking' | 'gym';
  difficulty: Difficulty;
  offers: readonly Offer[];
  points: number;
  pendingPoints: number;
  firstCollect: boolean;
  bankMinutes: number;
  today: { amount: number; minimum: number; met: boolean };
};
export function activityToGo(view: BankView, offer: Offer): number {
  const missing = Math.max(0, offer.price - view.points - view.pendingPoints);
  return view.activity === 'walking' ? missing : Math.ceil(missing / pointsPerGymMinute);
}
