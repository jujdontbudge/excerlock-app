import { ReachabilityPort } from '../../ports/ReachabilityPort';

/** How long one answer stands. Sync asks before every attempt and screens ask after a failure. */
export const REACHABILITY_CACHE_MS = 5_000;
/** A probe that has not answered by now is treated as offline; the next question re-probes. */
export const REACHABILITY_TIMEOUT_MS = 3_000;

export type ReachabilityFetch = (
  url: string,
  init: { method: 'GET'; signal: AbortSignal; headers: Record<string, string> },
) => Promise<{ status: number }>;

export type HttpReachabilityOptions = {
  baseUrl: string;
  fetch?: ReachabilityFetch;
  now?: () => number;
  cacheMs?: number;
  timeoutMs?: number;
};

/**
 * `ReachabilityPort` over the VPS's unauthenticated `GET /v1/health`.
 *
 * The question the app asks is "would a call to our server work", not "is there a network
 * interface", so the answer comes from trying: any HTTP status means the bytes reached a server and
 * the app is online, and only a fetch that throws — or one that never answers — means offline. A 503
 * from a server with a sick database is online; showing "you're offline" there would send the user
 * to check their Wi-Fi over our outage.
 *
 * Answers are cached for a few seconds and concurrent questions share one probe, so the sync host
 * asking before every attempt costs one request per retry window rather than one per attempt.
 */
export function createHttpReachability(options: HttpReachabilityOptions): ReachabilityPort {
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/health`;
  const fetchImpl = options.fetch ?? (globalThis.fetch as unknown as ReachabilityFetch);
  const now = options.now ?? (() => Date.now());
  const cacheMs = options.cacheMs ?? REACHABILITY_CACHE_MS;
  const timeoutMs = options.timeoutMs ?? REACHABILITY_TIMEOUT_MS;
  let answeredAt = -Infinity;
  let answer = true;
  let inFlight: Promise<boolean> | null = null;

  const probe = async (): Promise<boolean> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<false>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(false);
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        fetchImpl(url, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } }).then(
          () => true,
          () => false,
        ),
        timedOut,
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  return {
    async isOnline() {
      if (now() - answeredAt < cacheMs) return answer;
      inFlight ??= probe().then((result) => {
        answer = result;
        answeredAt = now();
        inFlight = null;
        return result;
      });
      return inFlight;
    },
  };
}
