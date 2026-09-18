import { backgroundWalkingReadiness } from '../backgroundWalking';
import { emptyPermissions } from '../../state/permissionsStore';
import type { Permissions } from '../types';

const permissions = (overrides: Partial<Permissions>): Permissions => ({ ...emptyPermissions, ...overrides });

test('hands-free walking is ready only with Motion & Fitness granted and location Always', () => {
  expect(backgroundWalkingReadiness(permissions({ motion: 'granted', location: 'always' }))).toEqual({ state: 'ready' });
});

test('a fresh walking user is asked for both grants, motion first', () => {
  expect(backgroundWalkingReadiness(permissions({}))).toEqual({ state: 'ask', missing: ['motion', 'location'] });
});

test('when-in-use location is still askable: iOS can offer the Always upgrade once', () => {
  expect(backgroundWalkingReadiness(permissions({ motion: 'granted', location: 'whenInUse' }))).toEqual({
    state: 'ask',
    missing: ['location'],
  });
});

test('a denied grant can only be repaired in iOS Settings', () => {
  expect(backgroundWalkingReadiness(permissions({ motion: 'denied', location: 'always' }))).toEqual({
    state: 'settings',
    blocked: ['motion'],
  });
  expect(backgroundWalkingReadiness(permissions({ motion: 'restricted', location: 'denied' }))).toEqual({
    state: 'settings',
    blocked: ['motion', 'location'],
  });
});

test('a denied grant outranks an unasked one: Settings is the only way forward', () => {
  expect(backgroundWalkingReadiness(permissions({ motion: 'notDetermined', location: 'denied' }))).toEqual({
    state: 'settings',
    blocked: ['location'],
  });
});
