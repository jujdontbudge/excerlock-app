import type { IdentityErasureGateway } from "./service.js";

type Fetch = typeof globalThis.fetch;

export interface IdentityErasureConfiguration {
  adaptySecretKey: string;
  posthogPersonalApiKey: string;
  posthogProjectId: string;
  posthogApiHost: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** @deprecated Legacy Clerk secret for the deprecated deleteClerkUser path. */
  clerkSecretKey?: string;
  fetch?: Fetch;
  timeoutMs?: number;
}

export class IdentityErasureRequestError extends Error {
  constructor(readonly processor: "Adapty" | "PostHog" | "Supabase" | "Clerk") {
    super(`${processor} identity erasure did not succeed`);
    this.name = "IdentityErasureRequestError";
  }
}

function requireSuccess(
  response: Response,
  processor: IdentityErasureRequestError["processor"],
  notFoundIsSuccess = false,
): void {
  if (response.ok || (notFoundIsSuccess && response.status === 404)) {
    return;
  }
  throw new IdentityErasureRequestError(processor);
}

function withTimeout(timeoutMs: number | undefined): {
  signal: AbortSignal | undefined;
  cancel: () => void;
} {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal: undefined, cancel: () => undefined };
  }
  // AbortSignal.timeout is available on Node 22; fall back to manual timer.
  try {
    const signal =
      typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(timeoutMs)
        : undefined;
    if (signal) {
      return { signal, cancel: () => undefined };
    }
  } catch {
    // Fall through to manual controller.
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

async function fetchWithTimeout(
  fetch: Fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number | undefined,
): Promise<Response> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    return await fetch(url, signal ? { ...init, signal } : init);
  } finally {
    cancel();
  }
}

export function supabaseAdminUserUrl(supabaseUrl: string, userId: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
}

export function createIdentityErasureGateway(
  configuration: IdentityErasureConfiguration,
): IdentityErasureGateway {
  const fetch = configuration.fetch ?? globalThis.fetch;
  const timeoutMs = configuration.timeoutMs;

  async function deleteSupabaseUser(userId: string): Promise<void> {
    const response = await fetchWithTimeout(
      fetch,
      supabaseAdminUserUrl(configuration.supabaseUrl, userId),
      {
        method: "DELETE",
        headers: {
          apikey: configuration.supabaseServiceRoleKey,
          authorization: `Bearer ${configuration.supabaseServiceRoleKey}`,
        },
      },
      timeoutMs,
    );
    // Provider not-found is idempotent success so lost-response retries
    // after auth erasure still checkpoint.
    requireSuccess(response, "Supabase", true);
  }

  return {
    async eraseAdaptyProfile(userId) {
      const response = await fetchWithTimeout(
        fetch,
        "https://api.adapty.io/api/v2/server-side-api/profile/",
        {
          method: "DELETE",
          headers: {
            authorization: `Api-Key ${configuration.adaptySecretKey}`,
            "adapty-customer-user-id": userId,
          },
        },
        timeoutMs,
      );
      requireSuccess(response, "Adapty", true);
    },

    async erasePosthogPerson(userId) {
      const host = configuration.posthogApiHost.replace(/\/$/, "");
      const response = await fetchWithTimeout(
        fetch,
        `${host}/api/projects/${encodeURIComponent(configuration.posthogProjectId)}/persons/bulk_delete/`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${configuration.posthogPersonalApiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            distinct_ids: [userId],
            delete_events: true,
            delete_recordings: true,
          }),
        },
        timeoutMs,
      );
      requireSuccess(response, "PostHog");
      const result = (await response.json().catch(() => null)) as unknown;
      if (
        typeof result !== "object" ||
        result === null ||
        !("deletion_errors" in result) ||
        !Array.isArray(result.deletion_errors) ||
        result.deletion_errors.length > 0
      ) {
        throw new IdentityErasureRequestError("PostHog");
      }
    },

    async deleteAuthUser(userId) {
      await deleteSupabaseUser(userId);
    },

    async deleteClerkUser(userId) {
      // Deprecated alias: historic Clerk rows used the Clerk admin API.
      // New Supabase rows must use deleteAuthUser. When a Clerk secret is
      // still configured this preserves the legacy endpoint for explicit
      // clerk-provider retries; otherwise it delegates to Supabase so old
      // callers cannot silently skip Supabase erasure.
      if (configuration.clerkSecretKey) {
        const response = await fetchWithTimeout(
          fetch,
          `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
          {
            method: "DELETE",
            headers: {
              authorization: `Bearer ${configuration.clerkSecretKey}`,
            },
          },
          timeoutMs,
        );
        requireSuccess(response, "Clerk", true);
        return;
      }
      await deleteSupabaseUser(userId);
    },
  };
}
