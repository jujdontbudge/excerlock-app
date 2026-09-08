import * as SecureStore from 'expo-secure-store';

/**
 * Where the refresh token lives.
 *
 * Supabase persists the whole session — access token, refresh token, user — as one JSON string. That
 * string is routinely larger than the ~2 KB an iOS keychain item accepts through `expo-secure-store`,
 * and the documented workaround is to encrypt it into AsyncStorage. ExcerLock does not take that
 * trade: no token may reach AsyncStorage, so the value is split across keychain items instead and
 * the keychain stays the only place a credential is written.
 *
 * A torn write reads back as `null`, which supabase-js treats as "no session". The cost of that is
 * one anonymous sign-in, never a wrong session, so the simple write order is the right one.
 *
 * Chunks are keyed `<key>.<index>`. SecureStore accepts alphanumerics, `.`, `-` and `_`, and
 * supabase-js deliberately keeps dots out of every key it writes (its SSR cookie adapter chunks the
 * same way), so a chunk key can never collide with a session, a PKCE verifier or a flow index.
 */
export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SecureVault = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

/** Keychain items accept about 2 KB; leave room for the key and the header. */
export const CHUNK_LIMIT = 1600;

const HEADER = /^v1:(\d+)$/;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

export function chunkedStore(vault: SecureVault, limit = CHUNK_LIMIT): KeyValueStore {
  const count = async (key: string) => {
    const header = await vault.getItemAsync(key);
    const match = header ? HEADER.exec(header) : null;
    return match ? Number(match[1]) : 0;
  };
  const drop = async (key: string, from: number, to: number) => {
    for (let index = from; index < to; index += 1) await vault.deleteItemAsync(chunkKey(key, index));
  };

  return {
    getItem: async (key) => {
      const total = await count(key);
      if (total === 0) return null;
      const parts: string[] = [];
      for (let index = 0; index < total; index += 1) {
        const part = await vault.getItemAsync(chunkKey(key, index));
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    },

    setItem: async (key, value) => {
      const previous = await count(key);
      const parts = value.match(new RegExp(`[\\s\\S]{1,${limit}}`, 'g')) ?? [''];
      for (const [index, part] of parts.entries()) await vault.setItemAsync(chunkKey(key, index), part);
      await vault.setItemAsync(key, `v1:${parts.length}`);
      await drop(key, parts.length, previous);
    },

    removeItem: async (key) => {
      const total = await count(key);
      await drop(key, 0, total);
      await vault.deleteItemAsync(key);
    },
  };
}

export function secureSessionStorage(): KeyValueStore {
  // WHEN_UNLOCKED is the default and the right one here: the app refreshes on foreground, so no
  // background task ever needs the token while the phone is locked.
  const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED };
  return chunkedStore({
    getItemAsync: (key) => SecureStore.getItemAsync(key, options),
    setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, options),
    deleteItemAsync: (key) => SecureStore.deleteItemAsync(key, options),
  });
}
