export const shopCopy = {
  title: 'Shop',
  points: 'Points',
  buy: 'Buy',
  offer: (time: string, price: number) => `${time} · ${price} Points`,
  confirm: (price: number) => `Buy · ${price}`,
  toGo: (amount: number, activity: 'walking' | 'gym') =>
    `≈ ${amount.toLocaleString('en-US')} ${activity === 'walking' ? 'steps' : 'gym minutes'} to go`,
};
