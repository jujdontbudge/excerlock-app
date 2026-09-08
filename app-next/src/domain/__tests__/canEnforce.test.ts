import { canEnforce } from '../canEnforce';

const selection = { handle: { token: 'selection' }, appCount: 2, categoryCount: 1 };

test('screen-time authorization is required before selection integrity matters', () => {
  expect(canEnforce({ screenTime: 'denied', selection })).toEqual({ ok: false, reason: 'screenTimeDenied' });
  expect(canEnforce({ screenTime: 'notDetermined', selection })).toEqual({
    ok: false,
    reason: 'screenTimeDenied',
  });
});

test('a null handle is no selection even when stale counts are non-zero', () => {
  expect(canEnforce({ screenTime: 'granted', selection: { handle: null, appCount: 2, categoryCount: 1 } })).toEqual({
    ok: false,
    reason: 'noSelection',
  });
  expect(canEnforce({ screenTime: 'granted', selection: { ...selection, appCount: 0, categoryCount: 0 } })).toEqual({
    ok: false,
    reason: 'noSelection',
  });
  expect(canEnforce({ screenTime: 'granted', selection })).toEqual({ ok: true });
});
