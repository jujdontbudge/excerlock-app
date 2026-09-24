import { needBlocked, setupNeeds } from '../setupNeeds';
import { makeRule } from '../../demo/scenarios/base';
import { emptyPermissions } from '../../state/permissionsStore';
import type { Permissions, Rule } from '../types';

const steps = makeRule('steps', { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 });
const walk = makeRule('walk', { kind: 'state', activity: 'walking' });
const gym = makeRule('gym', { kind: 'state', activity: 'gym' });
const arrival = makeRule('arrival', { kind: 'event', activity: 'gym', trigger: 'arrival' });
const chosen = { handle: null, isEmpty: false },
  none = { handle: null, isEmpty: true };
const ready: Permissions = { ...emptyPermissions, screenTime: 'granted', motion: 'granted', location: 'always' };
const needs = (rules: Rule[], permissions: Partial<Permissions> = {}, apps = chosen, gyms = 1) =>
  setupNeeds({ rules, permissions: { ...ready, ...permissions }, apps, gyms });

test('a fresh walking user needs apps, motion and Always location, in that order', () => {
  expect(setupNeeds({ rules: [walk], permissions: emptyPermissions, apps: none, gyms: 0 })).toEqual([
    'apps',
    'motion',
    'location',
  ]);
});

test('a step goal needs motion but not location', () => {
  expect(needs([steps], { motion: 'notDetermined', location: 'notDetermined' })).toEqual(['motion']);
});

test('walking while ExcerLock is closed needs Always, so While Using is not enough', () => {
  expect(needs([walk], { location: 'whenInUse' })).toEqual(['location']);
});

test('a gym needs While Using location and a saved gym, never motion', () => {
  expect(setupNeeds({ rules: [gym], permissions: emptyPermissions, apps: none, gyms: 0 })).toEqual([
    'apps',
    'location',
    'gym',
  ]);
  expect(needs([arrival], { location: 'whenInUse', motion: 'denied' })).toEqual([]);
});

test('Screen Time without chosen apps still needs apps', () => {
  expect(needs([gym], {}, none)).toEqual(['apps']);
  expect(needs([gym], { screenTime: 'denied' })).toEqual(['apps']);
});

test('paused conditions need nothing', () => {
  expect(setupNeeds({ rules: [{ ...walk, enabled: false }], permissions: emptyPermissions, apps: none, gyms: 0 })).toEqual([]);
  expect(setupNeeds({ rules: [], permissions: emptyPermissions, apps: none, gyms: 0 })).toEqual([]);
});

test('only a refused grant is blocked; iOS will not ask again, so Settings is the way back', () => {
  expect(needBlocked('apps', { ...emptyPermissions, screenTime: 'denied' })).toBe(true);
  expect(needBlocked('apps', { ...emptyPermissions, screenTime: 'restricted' })).toBe(true);
  expect(needBlocked('motion', { ...emptyPermissions, motion: 'denied' })).toBe(true);
  expect(needBlocked('location', { ...emptyPermissions, location: 'denied' })).toBe(true);
  expect(needBlocked('location', { ...emptyPermissions, location: 'whenInUse' })).toBe(false);
  expect(needBlocked('apps', emptyPermissions)).toBe(false);
  expect(needBlocked('gym', emptyPermissions)).toBe(false);
});
