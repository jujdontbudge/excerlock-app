import { gymPlace } from '../places';
import { base, makeRule } from './base';
export const permissionJourney = base('permission-journey', 'Permissions for walking and gym', {
  rules: [makeRule('walk', { kind: 'state', activity: 'walking' }), makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 })],
  lockedApps: { handle: null, isEmpty: true },
  permissions: { screenTime: 'notDetermined', motion: 'notDetermined', location: 'notDetermined', camera: 'notDetermined', notifications: 'notDetermined' },
});

export const permissionConditionEntry = base('permission-condition-entry', 'Gym plan adding its first Walking target', {
  rules: [makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' })],
  ruleDays: [],
  gym: { places: [gymPlace], presence: 'outside' },
  permissions: { screenTime: 'granted', motion: 'notDetermined', location: 'whenInUse', camera: 'notDetermined', notifications: 'granted' },
});

export const permissionGymSetup = base('permission-gym-setup', 'Paid Setup choosing its gym', {
  onboarding: 'resumeAt:P',
  onboardingAnswers: { activity: 'gym', gymMode: 'arrival', ruleCommitted: true },
  rules: [makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' })],
  gym: { places: [], presence: 'outside' },
});
