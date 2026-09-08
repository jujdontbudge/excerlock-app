import { base, makeRule } from './base';
import { gymPlace } from '../places';
export const scenario10 = base('gym-time-user', 'Gym · time goal', {
  rules: [makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 })],
  ruleDays: [{ ruleId: 'gym', day: '2026-09-07', progress: 12, met: false, metAt: null }],
  gym: { places: [gymPlace], presence: 'inside' },
  gymVisits: [
    {
      id: 'morning-visit',
      placeId: gymPlace.id,
      enteredAt: '2026-09-07T14:40:00.000Z',
      exitedAt: '2026-09-07T14:52:00.000Z',
      source: 'geofence',
    },
  ],
});
