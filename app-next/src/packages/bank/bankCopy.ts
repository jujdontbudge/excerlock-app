export const bankCopy = {
  title: 'Bank',
  points: 'Points',
  collect: 'Collect Points',
  shop: 'Shop',
  collectAmount: (amount: number) => `Collect +${amount.toLocaleString('en-US')}`,
  today: (amount: number, minimum: number, activity: 'walking' | 'gym') =>
    `${Math.floor(amount).toLocaleString('en-US')} / ${minimum.toLocaleString('en-US')} ${activity === 'walking' ? 'steps' : 'gym minutes'}`,
};
export function bankTime(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(whole / 60),
    rest = whole % 60;
  return hours ? `${hours} h${rest ? ` ${rest} m` : ''}` : `${rest} m`;
}
