import { CHUNK_LIMIT, chunkedStore, SecureVault } from '../secureSessionStorage';

function vaultDouble(): SecureVault & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItemAsync: async (key) => entries.get(key) ?? null,
    setItemAsync: async (key, value) => {
      entries.set(key, value);
    },
    deleteItemAsync: async (key) => {
      entries.delete(key);
    },
  };
}

const session = (size: number) => JSON.stringify({ refresh_token: 'r'.repeat(size) });

test('a session larger than one keychain item round-trips', async () => {
  const vault = vaultDouble();
  const store = chunkedStore(vault);
  const value = session(5000);
  await store.setItem('sb-auth-token', value);
  await expect(store.getItem('sb-auth-token')).resolves.toBe(value);
});

test('no single keychain item exceeds the size limit', async () => {
  const vault = vaultDouble();
  await chunkedStore(vault).setItem('sb-auth-token', session(5000));
  for (const stored of vault.entries.values()) expect(stored.length).toBeLessThanOrEqual(CHUNK_LIMIT);
});

test('a shorter session leaves no part of the longer one behind', async () => {
  const vault = vaultDouble();
  const store = chunkedStore(vault);
  await store.setItem('sb-auth-token', session(5000));
  await store.setItem('sb-auth-token', session(10));
  await expect(store.getItem('sb-auth-token')).resolves.toBe(session(10));
  expect([...vault.entries.keys()]).toEqual(['sb-auth-token.0', 'sb-auth-token']);
});

test('a torn write reads as no session rather than a broken one', async () => {
  const vault = vaultDouble();
  const store = chunkedStore(vault);
  await store.setItem('sb-auth-token', session(5000));
  await vault.deleteItemAsync('sb-auth-token.1');
  await expect(store.getItem('sb-auth-token')).resolves.toBeNull();
});

test('an absent key reads as no session', async () => {
  await expect(chunkedStore(vaultDouble()).getItem('sb-auth-token')).resolves.toBeNull();
});

test('removing a session clears every keychain item it used', async () => {
  const vault = vaultDouble();
  const store = chunkedStore(vault);
  await store.setItem('sb-auth-token', session(5000));
  await store.removeItem('sb-auth-token');
  expect([...vault.entries.keys()]).toEqual([]);
  await expect(store.getItem('sb-auth-token')).resolves.toBeNull();
});
