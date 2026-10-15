import { offers } from '../../model/bankEconomy';
export function bankDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest} m` : rest === 0 ? `${hours} h` : `${hours} h ${rest} m`;
}
export const bankDemoOffers = offers.map((offer) => ({ ...offer, label: bankDuration(offer.minutes) }));
export const bankOnboardingCopy = {
  title: 'What should an hour of screen time cost?',
};
