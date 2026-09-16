import { parseShieldCopyOverrides, serializeShieldCopyOverrides, SHIELD_COPY_CAUSES } from '../shieldCopyOverrides';

const valid = {
  fullLock: { title: 'Move first, scroll after.', subtitle: 'A 20-min walk gets you 30 more minutes.' },
  lockWindow: { title: 'Apps are asleep.' },
};

test('accepts and normalizes a valid payload', () => {
  expect(parseShieldCopyOverrides(valid)).toEqual(valid);
  expect(parseShieldCopyOverrides({ ...valid, balanceEmpty: { title: '  Time’s up — for now.  ' } })).toEqual({
    ...valid,
    balanceEmpty: { title: 'Time’s up — for now.' },
  });
});

test('accepts every cause and an empty object that clears the overrides', () => {
  expect(parseShieldCopyOverrides({})).toEqual({});
  for (const cause of SHIELD_COPY_CAUSES) {
    expect(parseShieldCopyOverrides({ [cause]: { title: 'Title' } })).toEqual({ [cause]: { title: 'Title' } });
  }
});

test('rejects unknown causes and unknown fields', () => {
  expect(parseShieldCopyOverrides({ full_lock: { title: 'Title' } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { body: 'Title' } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { title: 'Title', deepLink: 'excerlock://elsewhere' } })).toBeNull();
});

test('rejects non-object payloads and non-object causes', () => {
  for (const payload of [null, undefined, 'title', 7, true, ['fullLock'], { fullLock: 'Move first' }]) {
    expect(parseShieldCopyOverrides(payload)).toBeNull();
  }
});

test('rejects non-string, empty, and oversized copy', () => {
  expect(parseShieldCopyOverrides({ fullLock: { title: 7 } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { subtitle: true } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { title: '   ' } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { title: 'x'.repeat(81) } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { title: 'x'.repeat(80) } })).not.toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { subtitle: 'x'.repeat(161) } })).toBeNull();
  expect(parseShieldCopyOverrides({ fullLock: { subtitle: 'x'.repeat(160) } })).not.toBeNull();
});

test('serializes with a fixed cause order regardless of payload order', () => {
  const forward = serializeShieldCopyOverrides(parseShieldCopyOverrides(valid)!);
  const reversed = serializeShieldCopyOverrides(
    parseShieldCopyOverrides({ lockWindow: { title: 'Apps are asleep.' }, fullLock: valid.fullLock })!,
  );
  expect(reversed).toBe(forward);
  expect(JSON.parse(forward)).toEqual({ fullLock: valid.fullLock, lockWindow: { title: 'Apps are asleep.' } });
  expect(serializeShieldCopyOverrides({})).toBe('{}');
});
