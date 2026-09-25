import type { Environment } from "../../config/env.js";
import type { IdentityErasureGateway } from "./service.js";

type Fetch = typeof globalThis.fetch;

export interface IdentityErasureConfiguration {
  adaptySecretKey: string;
  adaptyApiUrl: string;
  posthogPersonalApiKey: string;
  posthogProjectId: string;
  posthogApiHost: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  clerkSecretKey?: string;
  fetch?: Fetch;
  timeoutMs?: number;
}

export function erasureConfigurationFrom(environment: Environment): IdentityErasureConfiguration {
  return {
    adaptySecretKey: environment.adaptySecretKey as string,
    adaptyApiUrl: environment.adaptyApiUrl,
    posthogPersonalApiKey: environment.posthogPersonalApiKey as string,
    posthogProjectId: environment.posthogProjectId as string,
    posthogApiHost: environment.posthogApiHost,
    supabaseUrl: environment.supabaseUrl as string,
    supabaseServiceRoleKey: environment.supabaseServiceRoleKey as string,
    ...(environment.clerkSecretKey ? { clerkSecretKey: environment.clerkSecretKey } : {}),
    timeoutMs: environment.deletionGatewayTimeoutMs,
  };
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

function timeoutSignal(timeoutMs: number | undefined): AbortSignal | undefined {
  if (!timeoutMs || timeoutMs <= 0) {
    return undefined;
  }
  return AbortSignal.timeout(timeoutMs);
}

async function fetchWithTimeout(
  fetch: Fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number | undefined,
): Promise<Response> {
  const signal = timeoutSignal(timeoutMs);
  return fetch(url, signal ? { ...init, signal } : init);
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
    requireSuccess(response, "Supabase", true);
  }

  return {
    async eraseAdaptyProfile(userId) {
      const response = await fetchWithTimeout(
        fetch,
        new URL("/api/v2/server-side-api/profile/", configuration.adaptyApiUrl).href,
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
