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
