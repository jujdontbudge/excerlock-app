import { ApiError } from './ApiError';

export type ApiResponse = { status: number; body: unknown };
export type ApiFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetch?: ApiFetch;
  timeoutMs?: number;
};

export type ApiClient = {
  request(path: string, init: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown }): Promise<ApiResponse>;
};

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * The one HTTP boundary to the VPS. Ported from `app/src/support/SupportHttpClient`: one timeout
 * covers token lookup, the request and the body read; a request never retries on its own, so a
 * failure surfaces as an `ApiError` the screen turns into "tap to retry". Every call carries the
 * Supabase access token; a missing token is `unauthenticated` before any bytes leave the device.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const fetchImpl = options.fetch ?? (globalThis.fetch as unknown as ApiFetch);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return {
    async request(path, init) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined,
        expired = false;
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new ApiError('timeout'));
          controller.abort();
        }, timeoutMs);
      });
      try {
        const token = await Promise.race([options.getAccessToken(), timedOut]);
        if (!token) throw new ApiError('unauthenticated');
        const body = init.body === undefined ? undefined : JSON.stringify(init.body);
        let response: Awaited<ReturnType<ApiFetch>>;
        try {
          response = await Promise.race([
            fetchImpl(`${baseUrl}${path}`, {
              method: init.method,
              headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
              },
              ...(body === undefined ? {} : { body }),
              signal: controller.signal,
            }),
            timedOut,
          ]);
        } catch (error) {
          // The abort listener can reject before the timeout promise settles; the clock decides.
          throw error instanceof ApiError ? error : new ApiError(expired ? 'timeout' : 'offline');
        }
        const text = await Promise.race([response.text().catch(() => ''), timedOut]);
        let parsed: unknown = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = null;
        }
        return { status: response.status, body: parsed };
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
  };
}

/** The `error.code` the server puts in every non-2xx body, when it did. */
export function errorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** Turns a non-2xx status into the `ApiError` the screens branch on. */
export function failureFor(response: ApiResponse): ApiError {
  const code = errorCode(response.body);
  if (response.status === 401) return new ApiError('unauthenticated', response.status, code);
  if (response.status >= 500) return new ApiError('unavailable', response.status, code);
  return new ApiError('rejected', response.status, code);
}
