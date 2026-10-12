import { base, makeRule } from './base';
import { gymPlace } from '../places';
const walk = makeRule('walk', { kind: 'state', activity: 'walking' });
const gym = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
export const unlockScenarios = [
  base('unlock-treadmill-scan', 'Unlock · treadmill scan', { rules: [walk], ruleDays: [], gait: 'walking' }),
  base('unlock-treadmill-stop', 'Unlock · treadmill stops', { rules: [walk], ruleDays: [], gait: 'walking-then-still' }),
  base('unlock-treadmill-framing', 'Unlock · treadmill framing', { rules: [walk], ruleDays: [], gait: 'still' }),
  base('unlock-treadmill-denied', 'Unlock · camera denied', {
    rules: [walk],
    ruleDays: [],
    permissions: { ...base('', '').permissions, camera: 'denied' },
  }),
  base('unlock-gym-inside', 'Unlock · at gym', {
    rules: [gym],
    ruleDays: [],
    gym: { places: [gymPlace], presence: 'inside' },
    fakeSystemPrompts: 'grant',
  }),
  base('unlock-gym-outside', 'Unlock · outside gym', {
    rules: [gym],
    ruleDays: [],
    gym: { places: [gymPlace], presence: 'outside' },
    fakeSystemPrompts: 'grant',
  }),
  base('unlock-gym-lost', 'Unlock · leave during check', {
    rules: [gym],
    ruleDays: [],
    gym: { places: [gymPlace], presence: 'inside' },
    fakeSystemPrompts: 'grant',
  }),
  base('unlock-treadmill-reduced', 'Unlock · treadmill reduced motion', {
    rules: [walk],
    ruleDays: [],
    gait: 'walking',
    accessibility: 'reduceMotion',
  }),
  base('unlock-gym-reduced', 'Unlock · gym reduced motion', {
    rules: [gym],
    ruleDays: [],
    gym: { places: [gymPlace], presence: 'inside' },
    accessibility: 'reduceMotion',
    fakeSystemPrompts: 'grant',
  }),
];
