export const format = {
  streak: (count: number) => `${count} day streak`,
  percent: (value: number) => `${Math.round(value * 100)}%`,
  progress: (value: number, goal: number) => `${value} of ${goal}`,
};
export function compactNumber(value: number) {
  const divisor = value >= 1000000 ? 1000000 : value >= 1000 ? 1000 : 1;
  const suffix = divisor === 1000000 ? 'm' : divisor === 1000 ? 'k' : '';
  return (divisor === 1 ? String(value) : (value / divisor).toFixed(1).replace(/\.0$/, '')) + suffix;
}
