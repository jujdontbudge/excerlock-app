import { SecureSupabaseStorage, SECURE_CHUNK_SIZE } from '../secureStorage';
import type { SecureStoreBackend } from '../secureStorage';

function memoryBackend(): SecureStoreBackend & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async getItemAsync(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItemAsync(key: string, value: string) {
      store.set(key, value);
    },
    async deleteItemAsync(key: string) {
      store.delete(key);
    },
  };
}

test('small values round-trip directly without chunking', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  const value = JSON.stringify({ access_token: 'a', refresh_token: 'r', user: { id: 'u1' } });
  await storage.setItem('k1', value);
  expect(await storage.getItem('k1')).toBe(value);
  // No chunk keys created.
  expect([...backend.store.keys()].filter((k) => k.includes('__chunk__'))).toHaveLength(0);
});

test('large serialized sessions chunk and reassemble safely', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  // Simulate a real Supabase session JSON larger than the SecureStore limit.
  const big = 'x'.repeat(SECURE_CHUNK_SIZE * 3 + 123);
  const value = JSON.stringify({ access_token: big, refresh_token: big, user: { id: 'u-big' } });
  expect(value.length).toBeGreaterThan(SECURE_CHUNK_SIZE);
  await storage.setItem('session', value);
  const chunkKeys = [...backend.store.keys()].filter((k) => k.includes('__chunk__'));
  expect(chunkKeys.length).toBeGreaterThan(1);
  expect(await storage.getItem('session')).toBe(value);
});

test('missing chunk rejects as corruption rather than resetting identity', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  const big = 'y'.repeat(SECURE_CHUNK_SIZE * 2);
  await storage.setItem('k2', big);
  // Corrupt: delete one chunk.
  const chunkKeys = [...backend.store.keys()].filter((k) => k.startsWith('k2__chunk__')).sort();
  expect(chunkKeys.length).toBeGreaterThan(1);
  backend.store.delete(chunkKeys[0]);
  await expect(storage.getItem('k2')).rejects.toThrow(/corrupt/i);
});

test('orphaned chunks without manifest reject rather than returning null', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  backend.store.set('k3__chunk__0', 'orphan');
  await expect(storage.getItem('k3')).rejects.toThrow(/corrupt|orphan/i);
});

test('manifest with invalid count rejects', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  backend.store.set('k4', JSON.stringify({ __chunked: true, chunks: 0 }));
  await expect(storage.getItem('k4')).rejects.toThrow(/corrupt/i);
});

test('removeItem clears manifest and chunks', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  const big = 'z'.repeat(SECURE_CHUNK_SIZE * 2);
  await storage.setItem('k5', big);
  expect([...backend.store.keys()].length).toBeGreaterThan(1);
  await storage.removeItem('k5');
  expect(await storage.getItem('k5')).toBeNull();
  expect([...backend.store.keys()].filter((k) => k.startsWith('k5'))).toHaveLength(0);
});

test('write failures reject visibly', async () => {
  const failing: SecureStoreBackend = {
    async getItemAsync() {
      return null;
    },
    async setItemAsync() {
      throw new Error('SecureStore unavailable');
    },
    async deleteItemAsync() {},
  };
  const storage = new SecureSupabaseStorage(failing);
  await expect(storage.setItem('k6', 'value')).rejects.toThrow(/unavailable/i);
});

test('interrupted replacement leaves previous committed session byte-for-byte intact', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  const oldValue = JSON.stringify({ value: 'a'.repeat(4000) });
  await storage.setItem('session', oldValue);
  const write = backend.setItemAsync.bind(backend);
  let writes = 0;
  backend.setItemAsync = async (key, value) => {
    if (++writes === 2) throw new Error('interrupted write');
    await write(key, value);
  };
  await expect(storage.setItem('session', JSON.stringify({ value: 'b'.repeat(5000) }))).rejects.toThrow();
  expect(await new SecureSupabaseStorage(backend).getItem('session')).toBe(oldValue);
});

test('concurrent replacements serialize; no mixed session can be read', async () => {
  const backend = memoryBackend();
  const one = new SecureSupabaseStorage(backend);
  const two = new SecureSupabaseStorage(backend);
  const values = ['a', 'b', 'c'].map((v) => JSON.stringify({ value: v.repeat(4100) }));
  await Promise.all([one.setItem('session', values[0]), two.setItem('session', values[1]), one.setItem('session', values[2])]);
  expect(await one.getItem('session')).toBe(values[2]);
});

test('chunks are bounded by UTF-8 bytes, not UTF-16 length', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  const value = JSON.stringify({ name: '🏃漢'.repeat(1500) });
  await storage.setItem('session', value);
  for (const part of backend.store.values()) expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(SECURE_CHUNK_SIZE);
  expect(await storage.getItem('session')).toBe(value);
});

test('silent chunk corruption is rejected by manifest integrity check', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  await storage.setItem('session', 'a'.repeat(4000));
  const key = [...backend.store.keys()].find((k) => k.includes('__chunk__'))!;
  backend.store.set(key, backend.store.get(key)!.replace('a', 'b'));
  await expect(storage.getItem('session')).rejects.toThrow(/corrupt/i);
});

test('session JSON corruption rejects before Supabase can treat it as absent', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  backend.store.set('excerlock-supabase-auth-v1', '{broken');
  await expect(storage.getItem('excerlock-supabase-auth-v1')).rejects.toThrow(/corrupt/i);
});

test('failed secret erasure is visible and tombstone prevents session resurrection', async () => {
  const backend = memoryBackend();
  const storage = new SecureSupabaseStorage(backend);
  await storage.setItem('session', 'a'.repeat(4000));
  const remove = backend.deleteItemAsync.bind(backend);
  backend.deleteItemAsync = async (key) => {
    if (key.includes('__chunk__')) throw new Error('keychain unavailable');
    await remove(key);
  };
  await expect(storage.removeItem('session')).rejects.toThrow();
  expect(await storage.getItem('session')).toBeNull();
  backend.deleteItemAsync = remove;
  await storage.removeItem('session');
  expect(backend.store.size).toBe(0);
});

test('legacy chunk manifest remains readable and migrates on successful rewrite', async () => {
  const backend = memoryBackend();
  backend.store.set('session', JSON.stringify({ __chunked: true, chunks: 2 }));
  backend.store.set('session__chunk__0', 'legacy');
  backend.store.set('session__chunk__1', '-session');
  const storage = new SecureSupabaseStorage(backend);
  expect(await storage.getItem('session')).toBe('legacy-session');
  await storage.setItem('session', 'new'.repeat(2000));
  expect(await storage.getItem('session')).toBe('new'.repeat(2000));
  expect(backend.store.has('session__chunk__0')).toBe(false);
});

test('every interrupted chunk/manifest write preserves the old committed session', async () => {
  for (let failAt = 1; failAt <= 4; failAt++) {
    const backend = memoryBackend();
    const storage = new SecureSupabaseStorage(backend);
    const before = JSON.stringify({ value: 'a'.repeat(4000) });
    await storage.setItem('session', before);
    const write = backend.setItemAsync.bind(backend);
    let writes = 0;
    backend.setItemAsync = async (key, value) => {
      if (++writes === failAt) throw new Error('interrupted');
      return write(key, value);
    };
    await expect(storage.setItem('session', JSON.stringify({ value: 'b'.repeat(5000) }))).rejects.toThrow();
    expect(await new SecureSupabaseStorage(backend).getItem('session')).toBe(before);
  }
});

test('unavailable orphan read never returns absent and sparse orphan is detected', async () => {
  const backend = memoryBackend();
  backend.store.set('session__chunk__b__9', 'secret');
  const storage = new SecureSupabaseStorage(backend);
  await expect(storage.getItem('session')).rejects.toThrow(/corrupt/i);
  backend.getItemAsync = async (key) => {
    if (key.includes('__chunk__')) throw new Error('unavailable');
    return null;
  };
  await expect(storage.getItem('session')).rejects.toThrow(/unavailable/i);
});
