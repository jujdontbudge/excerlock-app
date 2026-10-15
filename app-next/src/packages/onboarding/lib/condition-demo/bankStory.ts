export const bankOffers = [
  { label: '15 m', price: 25 },
  { label: '1 h', price: 100 },
  { label: '3 h', price: 250 },
  { label: '6 h', price: 450 },
] as const;
export const boughtOffer = 2;
export const bankStory = {
  tokens: 5,
  firstEmit: 0.2,
  emitEvery: 0.52,
  flight: 0.48,
  pointsPerToken: 50,
  pressAt: 0.12,
  press: 0.26,
  rollDown: 0.45,
  chip: { start: 0.08, duration: 0.52 },
  fill: { start: 0.5, duration: 0.4 },
  lift: 0.45,
  boughtMinutes: 180,
} as const;
export const bankPhases = [
  { name: 'earning', duration: 2.85 },
  { name: 'buying', duration: 0.45 },
  { name: 'spending', duration: 1 },
  { name: 'unlocked', duration: 1.75 },
  { name: 'reset', duration: 0.35 },
];
export function easeInOut(p: number) {
  'worklet';
  const x = Math.min(1, Math.max(0, p));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
export function tokenEmit(index: number) {
  'worklet';
  return bankStory.firstEmit + index * bankStory.emitEvery;
}
export function tokenFlight(index: number, phase: string, local: number) {
  'worklet';
  if (phase !== 'earning') return -1;
  const p = (local - tokenEmit(index)) / bankStory.flight;
  return p < 0 || p >= 1 ? -1 : p;
}
export function tokensLanded(phase: string, local: number) {
  'worklet';
  if (phase !== 'earning') return bankStory.tokens;
  let landed = 0;
  for (let index = 0; index < bankStory.tokens; index++)
    if (local >= tokenEmit(index) + bankStory.flight) landed++;
  return landed;
}
export function sinceLanding(phase: string, local: number) {
  'worklet';
  if (phase !== 'earning') return Infinity;
  let since = Infinity;
  for (let index = 0; index < bankStory.tokens; index++) {
    const landing = tokenEmit(index) + bankStory.flight;
    if (local >= landing) since = local - landing;
  }
  return since;
}
export function bankRestPoint(local: number) {
  'worklet';
  for (let index = 0; index < bankStory.tokens; index++) {
    const emit = tokenEmit(index);
    if (local > emit && local < emit + bankStory.flight) return emit + bankStory.flight;
  }
  return local;
}
export function bankFrame(phase: string, local: number) {
  'worklet';
  const full = bankStory.tokens * bankStory.pointsPerToken;
  const fill = phase === 'spending' ? easeInOut((local - bankStory.fill.start) / bankStory.fill.duration) : phase === 'unlocked' ? 1 : 0;
  const points =
    phase === 'earning'
      ? tokensLanded(phase, local) * bankStory.pointsPerToken
      : phase === 'buying'
        ? full
        : phase === 'spending'
          ? Math.round((full * (1 - easeInOut(local / bankStory.rollDown))) / 5) * 5
          : 0;
  return { points, fill, bankMinutes: Math.round(bankStory.boughtMinutes * fill) };
}
export function formatBank(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest} m` : rest === 0 ? `${hours} h` : `${hours} h ${rest} m`;
}
