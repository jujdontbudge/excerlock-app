export type PointsActivity = 'walking' | 'gym';

const number = (value: number) => Math.max(0, Math.round(value)).toLocaleString('en-US');
const roundToGo = (activity: PointsActivity, amount: number) =>
  activity === 'gym'
    ? Math.ceil(amount)
    : Math.ceil(amount / (amount >= 1000 ? 100 : 10)) * (amount >= 1000 ? 100 : 10);

const duration = (minutes: number, minuteUnit: string) => {
  const whole = Math.max(0, Math.floor(minutes)),
    hours = Math.floor(whole / 60),
    rest = whole % 60;
  return hours ? `${hours} h${rest ? ` ${rest} ${minuteUnit}` : ''}` : `${rest} ${minuteUnit}`;
};

export const formatBank = (minutes: number) => duration(minutes, 'm');

export const formatBankLeft = (minutes: number) => {
  const whole = Math.max(0, Math.floor(minutes));
  return `${Math.floor(whole / 60)} h ${whole % 60} m`;
};

export const formatOffer = (minutes: number) => duration(minutes, 'm');

const spokenDuration = (minutes: number) => duration(minutes, 'min');

export const rewards = {
  points: (value: number) => `${number(value)} Points`,
  token: { walking: 'Points from walking', gym: 'Points from the gym' } satisfies Record<PointsActivity, string>,
  collect: (amount: number) => `Collect ${number(amount)} Points`,
  collectChip: (amount: number) => `+${number(amount)}`,
  bank: 'in your Bank',
  bankLeft: 'left',
  bankLeftLabel: (minutes: number) => `${spokenDuration(minutes)} left in your Bank`,
  bankLabel: (minutes: number) => `${spokenDuration(minutes)} in your Bank`,
  buy: 'Buy',
  buyPrice: (price: number) => `Buy · ${number(price)}`,
  offerLabel: (minutes: number, price: number) => `${spokenDuration(minutes)} for ${number(price)} Points`,
  confirmLabel: (minutes: number, price: number) => `Buy ${spokenDuration(minutes)} for ${number(price)} Points`,
  bought: (minutes: number) => `+${formatOffer(minutes)}`,
  toGo: (activity: PointsActivity, amount: number) =>
    amount <= 0
      ? 'Collect on Home to buy'
      : activity === 'gym'
        ? `≈ ${number(roundToGo(activity, amount))} gym min to go`
        : `≈ ${number(roundToGo(activity, amount))} steps to go`,
  difficulty: (title: string, trade: string) => `${title}, ${trade}`,
};
