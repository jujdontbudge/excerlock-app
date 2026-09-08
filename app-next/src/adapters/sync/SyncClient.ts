/**
 * The HTTP edge of sync: one bearer-authenticated JSON call at a time against the VPS API. It knows nothing
 * about rows; `SyncAdapter` shapes the bodies and `SyncHost` decides what to retry.
 */
export type SyncErrorKind = 'auth' | 'network' | 'server' | 'client';

export class SyncError extends Error {
  readonly kind: SyncErrorKind;
  readonly status: number | null;
  constructor(kind: SyncErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'SyncError';
    this.kind = kind;
    this.status = status;
  }
  /** Network and server failures are retried with backoff; auth waits for a session; client errors are dropped. */
  get retryable() {
    return this.kind === 'network' || this.kind === 'server';
  }
}

/** Supplied by the auth adapter (P2-T01): the current Supabase access token, or null when there is no session. */
export type AccessTokenSource = () => Promise<string | null>;

export type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type SyncClient = {
  put(path: string, body: unknown): Promise<void>;
  get(path: string): Promise<unknown>;
};

export const defaultBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.excerlock.com';

export function createSyncClient(options: {
  accessToken: AccessTokenSource;
  baseUrl?: string;
  fetch?: FetchLike;
}): SyncClient {
  const baseUrl = (options.baseUrl ?? defaultBaseUrl).replace(/\/$/, '');
  const fetchImpl: FetchLike = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const call = async (method: 'PUT' | 'GET', path: string, body?: unknown): Promise<unknown> => {
    const token = await options.accessToken();
    if (!token) throw new SyncError('auth', 'No access token', null);
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (cause) {
      throw new SyncError('network', cause instanceof Error ? cause.message : 'Request failed', null);
    }
    if (response.status === 401) throw new SyncError('auth', 'Session rejected', 401);
    if (response.status >= 500 || response.status === 408 || response.status === 429)
      throw new SyncError('server', `Server returned ${response.status}`, response.status);
    if (!response.ok) throw new SyncError('client', `Request rejected with ${response.status}`, response.status);
    if (method === 'GET') return response.json();
    return undefined;
  };
  return {
    put: async (path, body) => {
      await call('PUT', path, body);
    },
    get: (path) => call('GET', path),
  };
}
