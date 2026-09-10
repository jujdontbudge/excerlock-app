import type { SupportedStorage } from '@supabase/auth-js';

export type SecureStoreBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
export const SUPABASE_STORAGE_KEY = 'excerlock-supabase-auth-v1';
/** Conservative UTF-8 byte budget; not a claim of a universal Keychain limit. */
export const SECURE_CHUNK_SIZE = 1800;
export const SECURE_MAX_CHUNKS = 32;
type Bank = 'a' | 'b';
type Manifest = { __chunked: true; chunks: number; version?: 2; bank?: Bank; length?: number; checksum?: string };
const queues = new WeakMap<SecureStoreBackend, Map<string, Promise<unknown>>>();
const corrupt = () => new Error('SecureStore session corrupt; retry without replacing identity');
const chunkKey = (key: string, index: number, bank?: Bank) => `${key}__chunk__${bank ? `${bank}__` : ''}${index}`;

// Integrity check detects torn/mixed writes, not hostile tampering. Keychain owns
// confidentiality/integrity against other apps; no token-derived hash is logged.
function checksum(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
function parse(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return undefined; }
}
function manifest(raw: string): Manifest | null {
  const value = parse(raw);
  if (!value || typeof value !== 'object' || !('__chunked' in value)) return null;
  const m = value as Manifest;
  if (m.__chunked !== true || !Number.isInteger(m.chunks) || m.chunks < 1 || m.chunks > SECURE_MAX_CHUNKS) throw corrupt();
  if (m.version !== undefined && (m.version !== 2 || !['a', 'b'].includes(m.bank ?? '') ||
    !Number.isInteger(m.length) || m.length! < 0 || typeof m.checksum !== 'string')) throw corrupt();
  return m;
}
function deleted(raw: string): boolean {
  const value = parse(raw);
  return !!value && typeof value === 'object' && '__secureDeleted' in value && value.__secureDeleted === true;
}
function validateSession(key: string, value: string): string {
  // auth-js 2.116 silently maps malformed JSON to "absent". Reject it here
  // before that helper can create a new anonymous account. PKCE auxiliary keys
  // and general storage keys retain SupportedStorage's arbitrary-string contract.
  if (key === SUPABASE_STORAGE_KEY) {
    const session = parse(value);
    if (!session || typeof session !== 'object' || Array.isArray(session) ||
      !('access_token' in session) || typeof session.access_token !== 'string' ||
      !('refresh_token' in session) || typeof session.refresh_token !== 'string' ||
      !('user' in session) || !session.user || typeof session.user !== 'object' ||
      !('id' in session.user) || typeof session.user.id !== 'string') throw corrupt();
  }
  return value;
}
function split(value: string): string[] {
  const chunks: string[] = [];
  let part = '', bytes = 0;
  for (const point of value) {
    const code = point.codePointAt(0)!;
    const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes + size > SECURE_CHUNK_SIZE) { chunks.push(part); part = ''; bytes = 0; }
    part += point; bytes += size;
  }
  chunks.push(part);
  if (chunks.length > SECURE_MAX_CHUNKS) throw new Error('SecureStore value exceeds secure chunk budget');
  return chunks;
}
async function defaultBackend(): Promise<SecureStoreBackend> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-secure-store') as SecureStoreBackend;
}

/**
 * Copy-on-write two-bank storage: write inactive chunks, commit ONE manifest,
 * then reclaim old chunks. A failed replacement never overwrites committed
 * chunks. Reads/writes/removes serialize per backend/key, across adapter instances.
 * Keychain single-item atomic replacement is the underlying durability boundary.
 * Legacy manifests read unchanged and migrate on the next successful write.
 */
export class SecureSupabaseStorage implements SupportedStorage {
  private backendPromise: Promise<SecureStoreBackend>;
  constructor(backend?: SecureStoreBackend | Promise<SecureStoreBackend>) {
    this.backendPromise = backend ? Promise.resolve(backend) : defaultBackend();
  }
  private async exclusive<T>(key: string, operation: (store: SecureStoreBackend) => Promise<T>): Promise<T> {
    const store = await this.backendPromise;
    let map = queues.get(store);
    if (!map) { map = new Map(); queues.set(store, map); }
    const result = (map.get(key) ?? Promise.resolve()).catch(() => undefined).then(() => operation(store));
    map.set(key, result);
    try { return await result; } finally { if (map.get(key) === result) map.delete(key); }
  }
  private async cleanup(store: SecureStoreBackend, key: string, keep?: Bank): Promise<void> {
    // Scan every bounded slot, not just a contiguous prefix: interrupted cleanup
    // can leave holes. Never silently report successful erasure of leftover secrets.
    for (const bank of [undefined, 'a', 'b'] as const) {
      if (keep !== undefined && bank === keep) continue;
      for (let i = 0; i < SECURE_MAX_CHUNKS; i++) {
        const slot = chunkKey(key, i, bank);
        if (await store.getItemAsync(slot) !== null) await store.deleteItemAsync(slot);
      }
    }
  }
  getItem(key: string): Promise<string | null> {
    return this.exclusive(key, async (store) => {
      const raw = await store.getItemAsync(key);
      if (raw === null) {
        // Interrupted first write is not "no session". Fail closed even after
        // cleanup holes, and propagate unavailable Keychain reads unchanged.
        for (const bank of [undefined, 'a', 'b'] as const) {
          for (let i = 0; i < SECURE_MAX_CHUNKS; i++) {
            if (await store.getItemAsync(chunkKey(key, i, bank)) !== null) throw corrupt();
          }
        }
        return null;
      }
      if (deleted(raw)) return null;
      const m = manifest(raw);
      if (!m) return validateSession(key, raw);
      const parts: string[] = [];
      for (let i = 0; i < m.chunks; i++) {
        const part = await store.getItemAsync(chunkKey(key, i, m.bank));
        if (part === null) throw corrupt();
        parts.push(part);
      }
      const value = parts.join('');
      if (m.version === 2 && (value.length !== m.length || checksum(value) !== m.checksum)) throw corrupt();
      return validateSession(key, value);
    });
  }
  setItem(key: string, value: string): Promise<void> {
    return this.exclusive(key, async (store) => {
      validateSession(key, value);
      const chunks = split(value);
      const raw = await store.getItemAsync(key);
      const previous = raw === null || deleted(raw) ? null : manifest(raw);
      if (chunks.length === 1) {
        await store.setItemAsync(key, value);
        // Logical write committed; cleanup failure cannot invalidate it. Explicit
        // removeItem scans all banks later and reports every erasure failure.
        await this.cleanup(store, key).catch(() => undefined);
        return;
      }
      const bank: Bank = previous?.bank === 'a' ? 'b' : 'a';
      for (let i = 0; i < chunks.length; i++) await store.setItemAsync(chunkKey(key, i, bank), chunks[i]);
      const next: Manifest = { __chunked: true, version: 2, bank, chunks: chunks.length, length: value.length, checksum: checksum(value) };
      await store.setItemAsync(key, JSON.stringify(next));
      await this.cleanup(store, key, bank).catch(() => undefined);
    });
  }
  removeItem(key: string): Promise<void> {
    return this.exclusive(key, async (store) => {
      // First invalidate logically. An interrupted erasure stays tombstoned,
      // never reloads a partially erased old token; callers still receive error.
      await store.setItemAsync(key, JSON.stringify({ __secureDeleted: true }));
      await this.cleanup(store, key);
      await store.deleteItemAsync(key);
    });
  }
}
export function createSecureSupabaseStorage(backend?: SecureStoreBackend): SecureSupabaseStorage {
  return new SecureSupabaseStorage(backend);
}
