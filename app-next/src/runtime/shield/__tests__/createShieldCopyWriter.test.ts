import { createShieldCopyWriter } from '../createShieldCopyWriter';
import type { ShieldCopyOverridesJson } from '../shieldCopyOverrides';

function fixture(payload: unknown = { fullLock: { title: 'Move first, scroll after.' } }) {
  const writes: string[] = [];
  const reported: unknown[] = [];
  let foreground = true;
  let read = async () => payload;
  let writeGate: Promise<void> | null = null;
  let releaseGate: (() => void) | null = null;
  const writer = createShieldCopyWriter({
    readPayload: () => read(),
    write: async (json: ShieldCopyOverridesJson) => {
      if (writeGate) await writeGate;
      writes.push(json);
    },
    isForeground: () => foreground,
    reportError: (error) => reported.push(error),
  });
  return {
    writer,
    writes,
    reported,
    setPayload(next: unknown) {
      read = async () => next;
    },
    setForeground(next: boolean) {
      foreground = next;
    },
    deferWrite() {
      writeGate = new Promise<void>((resolve) => {
        releaseGate = resolve;
      });
      return () => {
        releaseGate?.();
        releaseGate = null;
        writeGate = null;
      };
    },
    deferRead() {
      let release: (() => void) | null = null;
      read = () =>
        new Promise((resolve) => {
          release = () => resolve(payload);
        });
      return () => release?.();
    },
  };
}

test('writes the canonical JSON for a valid payload', async () => {
  const x = fixture();
  await expect(x.writer.sync()).resolves.toBe('written');
  expect(x.writes).toEqual(['{"fullLock":{"title":"Move first, scroll after."}}']);
});

test('malformed payloads write nothing and clear nothing', async () => {
  for (const payload of [
    { fullLock: { title: 7 } },
    { fullLock: { title: 'x'.repeat(81) } },
    { unknownCause: { title: 'Title' } },
    { fullLock: 'Move first' },
    null,
  ]) {
    const x = fixture(payload);
    await expect(x.writer.sync()).resolves.toBe('malformed');
    expect(x.writes).toEqual([]);
  }
});

test('an absent payload writes nothing', async () => {
  const x = fixture();
  x.setPayload(undefined);
  await expect(x.writer.sync()).resolves.toBe('no-payload');
  expect(x.writes).toEqual([]);
});

test('an empty payload clears the overrides through a valid write', async () => {
  const x = fixture({});
  await expect(x.writer.sync()).resolves.toBe('written');
  expect(x.writes).toEqual(['{}']);
});

test('skips without reading while the app is not foreground', async () => {
  const x = fixture();
  x.setForeground(false);
  await expect(x.writer.sync()).resolves.toBe('skipped');
  expect(x.writes).toEqual([]);
});

test('a payload that settles into the background defers the write', async () => {
  const x = fixture();
  const releaseRead = x.deferRead();
  const pending = x.writer.sync();
  x.setForeground(false);
  releaseRead();
  await expect(pending).resolves.toBe('skipped');
  expect(x.writes).toEqual([]);
});

test('rewrites only when the settled payload changes', async () => {
  const x = fixture();
  await x.writer.sync();
  await expect(x.writer.sync()).resolves.toBe('unchanged');
  expect(x.writes).toHaveLength(1);
  x.setPayload({ fullLock: { title: 'Move now.' } });
  await expect(x.writer.sync()).resolves.toBe('written');
  expect(x.writes).toHaveLength(2);
});

test('shares one in-flight sync and reads again after it settles', async () => {
  const x = fixture();
  const release = x.deferWrite();
  const first = x.writer.sync();
  const second = x.writer.sync();
  expect(second).toBe(first);
  release();
  await expect(first).resolves.toBe('written');
  expect(x.writes).toHaveLength(1);
  await expect(x.writer.sync()).resolves.toBe('unchanged');
});

test('a failed read is reported without rejecting the foreground call', async () => {
  const reported: unknown[] = [];
  const writer = createShieldCopyWriter({
    readPayload: async () => {
      throw new Error('flag read failed');
    },
    write: async () => undefined,
    isForeground: () => true,
    reportError: (error) => reported.push(error),
  });
  await expect(writer.sync()).resolves.toBe('skipped');
  expect(reported).toHaveLength(1);
});

test('a failed write is reported and not remembered as written', async () => {
  const writes: string[] = [];
  const reported: unknown[] = [];
  let attempt = 0;
  const writer = createShieldCopyWriter({
    readPayload: async () => ({ fullLock: { title: 'Move first.' } }),
    write: async (json) => {
      attempt += 1;
      if (attempt === 1) throw new Error('native write failed');
      writes.push(json);
    },
    isForeground: () => true,
    reportError: (error) => reported.push(error),
  });
  await expect(writer.sync()).resolves.toBe('skipped');
  expect(reported).toHaveLength(1);
  await expect(writer.sync()).resolves.toBe('written');
  expect(writes).toEqual(['{"fullLock":{"title":"Move first."}}']);
});
