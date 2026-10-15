import { bankDemoOffers } from '../bankOnboardingCopy';
import { bankPhoneLayout } from './layout';
export { bankDemoOffers as bankOffers, bankDuration as formatBank } from '../bankOnboardingCopy';
export const boughtOffer = bankDemoOffers.findIndex((offer) => offer.id === 'h3');
const demoOffer = bankDemoOffers[boughtOffer];
export const bankStory = {
  tokens: 5,
  firstEmit: 0.2,
  emitEvery: 0.52,
  flight: 0.48,
  pointsPerToken: demoOffer.price / 5,
  pressAt: 0.08,
  confirmAt: 0.42,
  press: 0.2,
  stream: { depart: 0.14, every: 0.034, flight: 0.42, spill: 0.14 },
  rollDown: { start: 0.06, duration: 0.5 },
  pulse: 0.16,
  gain: 0.42,
  lift: 0.45,
  boughtMinutes: demoOffer.minutes,
} as const;
export const bankPhases = [
  { name: 'earning', duration: 2.85 },
  { name: 'buying', duration: 0.6 },
  { name: 'spending', duration: 1.35 },
  { name: 'unlocked', duration: 1.5 },
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
export function streamDepart(index: number) {
  'worklet';
  return bankStory.stream.depart + index * bankStory.stream.every;
}
export const streamLanded = streamDepart(bankPhoneLayout.stream.count - 1) + bankStory.stream.flight;
export function sinceStreamLanding(phase: string, local: number) {
  'worklet';
  if (phase !== 'spending') return Infinity;
  let since = Infinity;
  for (let index = 0; index < bankPhoneLayout.stream.count; index++) {
    const landing = streamDepart(index) + bankStory.stream.flight;
    if (local >= landing) since = local - landing;
  }
  return since;
}
export function bankFrame(phase: string, local: number) {
  'worklet';
  const full = bankStory.tokens * bankStory.pointsPerToken;
  const spent = phase === 'spending' ? easeInOut((local - bankStory.rollDown.start) / bankStory.rollDown.duration) : 0;
  const points =
    phase === 'earning'
      ? tokensLanded(phase, local) * bankStory.pointsPerToken
      : phase === 'buying'
        ? full
        : phase === 'spending'
          ? Math.round((full * (1 - spent)) / 5) * 5
          : 0;
  const bought = (phase === 'spending' && local >= streamLanded) || phase === 'unlocked';
  return { points, bankMinutes: bought ? bankStory.boughtMinutes : 0 };
}
