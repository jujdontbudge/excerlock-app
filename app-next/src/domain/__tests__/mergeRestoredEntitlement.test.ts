import { mergeRestoredEntitlement } from '../mergeRestoredEntitlement';

test('a restore that finds nothing keeps an active entitlement', () => {
  const current = { status: 'active' as const, renewsAt: '2026-10-07T15:00:00.000Z' };
  expect(mergeRestoredEntitlement(current, { status: 'none', renewsAt: null })).toBe(current);
});

test('a real restored purchase upgrades a none entitlement', () => {
  expect(
    mergeRestoredEntitlement(
      { status: 'none', renewsAt: null },
      { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' },
    ),
  ).toEqual({ status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' });
});

test('a restore never downgrades active access to trial', () => {
  const current = { status: 'active' as const, renewsAt: '2026-10-07T15:00:00.000Z' };
  expect(
    mergeRestoredEntitlement(current, { status: 'trial', renewsAt: '2026-09-14T15:00:00.000Z' }),
  ).toBe(current);
});

test('a trial restore keeps the trial already on the device', () => {
  const current = { status: 'trial' as const, renewsAt: '2026-09-14T15:00:00.000Z' };
  expect(
    mergeRestoredEntitlement(current, { status: 'trial', renewsAt: '2026-09-10T15:00:00.000Z' }),
  ).toBe(current);
});
