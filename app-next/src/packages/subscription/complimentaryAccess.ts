export type ComplimentaryAccess = (userId: string) => Promise<string | null>;

type AuthContext = { accessToken: string; userId: string };
const REQUEST_TIMEOUT_MS = 10_000;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

export function createComplimentaryAccess(options: {
  apiBaseUrl: string;
  getAuthContext(): Promise<AuthContext | null>;
  fetchImpl?: typeof fetch;
}): ComplimentaryAccess {
  return async (userId) => {
    const auth = await options.getAuthContext();
    if (!auth || auth.userId !== userId) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await (options.fetchImpl ?? fetch)(`${options.apiBaseUrl.replace(/\/$/, '')}/v1/subscription/resync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
        body: '{}',
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      if (!isObject(payload) || payload.accountId !== userId || !isObject(payload.authorization)) return null;
      const { source, hasAccess, expiresAt } = payload.authorization;
      if (source !== 'complimentary' || hasAccess !== true || typeof expiresAt !== 'string') return null;
      return Number.isFinite(Date.parse(expiresAt)) ? expiresAt : null;
    } finally {
      clearTimeout(timer);
    }
  };
}
