import { base, makeRule } from './base';
import { gymPlace } from '../places';
export const scenario9 = base('gym-arrival-user', 'Gym · arrival', {
  rules: [makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' })],
  ruleDays: [],
  gym: { places: [gymPlace], presence: 'outside' },
});
