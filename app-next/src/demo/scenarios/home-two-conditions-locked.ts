import { base, makeRule } from './base';
import { gymPlace } from '../places';

export const homeTwoConditionsLocked = base('home-two-conditions-locked', 'Home · two locked conditions', {
  rules: [makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' }), makeRule()],
  gym: { places: [gymPlace], presence: 'outside' },
});
