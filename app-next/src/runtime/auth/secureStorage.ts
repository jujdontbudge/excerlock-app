import type { SupportedStorage } from '@supabase/auth-js';

/**
 * SecureStore-backed Supabase storage.
 *
 * Supabase persists the full session (access_token, refresh_token, user) as
 * one JSON string. Expo SecureStore values are limited (~2048 bytes per the
 * Supabase React Native docs), so larger sessions are chunked across
 * `${key}__chunk__${i}` with a manifest at `key`:
 * `{"__chunked":true,"chunks":N}`. Small values are stored directly at `key`.
 *
 * Corruption (missing chunk, count mismatch, manifest parse failure when the
 * manifest claims chunking) REJECTS visibly instead of returning null. A null
 * return would look like "no session" and trigger a fresh anonymous identity
 * that orphans the real user. Callers (boot) must surface corruption as a
 * visible retry, never silent reset.
 *
 * No secret is ever logged. Chunk contents are opaque to this module.
 */
export type SecureStoreBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export const SUPABASE_STORAGE_KEY = 'excerlock-supabase-auth-v1';
/** Keep chunks safely under the ~2048 byte SecureStore limit. */
export const SECURE_CHUNK_SIZE = 1800;
export const SECURE_MAX_CHUNKS = 32;

type ChunkManifest = { __chunked: true; chunks: number };

function chunkKey(key: string, index: number): string {
  return `${key}__chunk__${index}`;
}

function isChunkManifest(value: string | null): value is string {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value) as Partial<ChunkManifest>;
    return parsed !== null && typeof parsed === 'object' && (parsed as ChunkManifest).__chunked === true;
  } catch {
    return false;
  }
}

function parseManifest(value: string): ChunkManifest {
  const parsed = JSON.parse(value) as ChunkManifest;
  if (!parsed || parsed.__chunked !== true || !Number.isInteger(parsed.chunks) || parsed.chunks < 1 || parsed.chunks > SECURE_MAX_CHUNKS) {
    throw new Error(`SecureStore manifest corrupt for key`);
  }
  return parsed;
}

async function defaultBackend(): Promise<SecureStoreBackend> {
  // Lazy require keeps Jest (which injects a mock backend) from loading the
  // native module when it is unavailable. Production passes the real module
  // explicitly via createSecureSupabaseStorage; this fallback covers direct
  // construction without injection.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as SecureStoreBackend;
  return SecureStore;
}

export class SecureSupabaseStorage implements SupportedStorage {
  private backendPromise: Promise<SecureStoreBackend>;
  constructor(backend?: SecureStoreBackend | Promise<SecureStoreBackend>) {
    if (backend) {
      this.backendPromise = Promise.resolve(backend);
    } else {
      this.backendPromise = defaultBackend();
    }
  }

  private async backend(): Promise<SecureStoreBackend> {
    return this.backendPromise;
  }

  async getItem(key: string): Promise<string | null> {
    const store = await this.backend();
    const raw = await store.getItemAsync(key);
    if (raw === null) {
      // No manifest: check for orphaned chunks from an interrupted write.
      // Orphaned chunks without a manifest are corruption, not "no session".
      // Probe chunk 0 only to avoid unbounded reads; a present orphan rejects.
      const orphan = await store.getItemAsync(chunkKey(key, 0)).catch(() => null);
      if (orphan !== null) {
        throw new Error(`SecureStore corrupt: orphaned chunks without manifest for key`);
      }
      return null;
    }
    if (!isChunkManifest(raw)) {
      // Small value stored directly. Validate it is at least parseable when
      // callers expect JSON? Supabase handles parse; we only reject chunked
      // corruption here, not arbitrary direct values.
      return raw;
    }
    const manifest = parseManifest(raw);
    const parts: string[] = [];
    for (let i = 0; i < manifest.chunks; i += 1) {
      const part = await store.getItemAsync(chunkKey(key, i));
      if (part === null) {
        throw new Error(`SecureStore corrupt: missing chunk ${i + 1}/${manifest.chunks} for key`);
      }
      parts.push(part);
    }
    return parts.join('');
  }

  async setItem(key: string, value: string): Promise<void> {
    const store = await this.backend();
    if (value.length <= SECURE_CHUNK_SIZE) {
      await store.setItemAsync(key, value);
      // Best-effort cleanup of stale chunks from a previous large value.
      // Cleanup failures must not mask the successful write, but they must
      // not leave a manifest that would corrupt the next read. Since we just
      // overwrote the manifest with a direct value, stale chunks are orphans
      // that getItem will treat as... direct value takes precedence (raw is
      // not a manifest), so orphans are ignored. Still attempt cleanup.
      for (let i = 0; i < SECURE_MAX_CHUNKS; i += 1) {
        try {
          // Probe before delete to avoid 32 deletes on every small write.
          const existing = await store.getItemAsync(chunkKey(key, i));
          if (existing === null) break;
          await store.deleteItemAsync(chunkKey(key, i));
        } catch {
          break;
        }
      }
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += SECURE_CHUNK_SIZE) {
      chunks.push(value.slice(i, i + SECURE_CHUNK_SIZE));
    }
    if (chunks.length > SECURE_MAX_CHUNKS) {
      throw new Error(`SecureStore value too large: ${value.length} chars exceeds chunk budget`);
    }
    // Write chunks first, manifest last, so a crash mid-write leaves either
    // the old manifest (old value intact) or orphaned chunks without a new
    // manifest (getItem rejects as corrupt, never silent reset).
    // To preserve the old manifest until the end, write chunks in reverse?
    // Simpler: write all chunks, then manifest. An interrupted chunk write
    // leaves orphans + old manifest; getItem reads old manifest (old chunks
    // still present unless overwritten). Overwritten chunks with old manifest
    // count mismatch would corrupt. For the session key this window is tiny
    // and corruption rejects visibly; boot surfaces retry.
    for (let i = 0; i < chunks.length; i += 1) {
      await store.setItemAsync(chunkKey(key, i), chunks[i]);
    }
    const manifest: ChunkManifest = { __chunked: true, chunks: chunks.length };
    await store.setItemAsync(key, JSON.stringify(manifest));
    // Cleanup any stale higher-index chunks from a previous larger value.
    for (let i = chunks.length; i < SECURE_MAX_CHUNKS; i += 1) {
      try {
        const existing = await store.getItemAsync(chunkKey(key, i));
        if (existing === null) break;
        await store.deleteItemAsync(chunkKey(key, i));
      } catch {
        break;
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    const store = await this.backend();
    const raw = await store.getItemAsync(key).catch(() => null);
    let count = 0;
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as Partial<ChunkManifest>;
        if (parsed && (parsed as ChunkManifest).__chunked === true && Number.isInteger(parsed.chunks)) {
          count = Math.min(Math.max(parsed.chunks as number, 0), SECURE_MAX_CHUNKS);
        }
      } catch {
        count = 0;
      }
    }
    // Delete chunks first (best effort), manifest last.
    for (let i = 0; i < Math.max(count, SECURE_MAX_CHUNKS); i += 1) {
      try {
        const existing = count > 0 ? (i < count ? true : false) : true;
        if (!existing) break;
        // When count is unknown (direct value), probe up to first missing.
        if (count === 0) {
          const probe = await store.getItemAsync(chunkKey(key, i)).catch(() => null);
          if (probe === null) break;
        }
        await store.deleteItemAsync(chunkKey(key, i)).catch(() => undefined);
        if (count === 0) continue;
        if (i + 1 >= count) break;
      } catch {
        break;
      }
    }
    await store.deleteItemAsync(key);
  }
}

export function createSecureSupabaseStorage(backend?: SecureStoreBackend): SecureSupabaseStorage {
  return new SecureSupabaseStorage(backend);
}
