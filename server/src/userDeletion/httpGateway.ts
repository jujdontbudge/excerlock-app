import type { IdentityErasureGateway } from "./service.js";

type Fetch = typeof globalThis.fetch;

export interface IdentityErasureConfiguration {
  /** Project origin, e.g. `https://<ref>.supabase.co`. */
  supabaseUrl: string;
  /** Admin API credential. This is its only use anywhere in the server. */
  supabaseServiceRoleKey: string;
  adaptySecretKey: string;
  posthogPersonalApiKey: string;
  posthogProjectId: string;
  posthogApiHost: string;
  fetch?: Fetch;
}

export class IdentityErasureRequestError extends Error {
  constructor(readonly processor: "Adapty" | "PostHog" | "Supabase") {
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

export function createIdentityErasureGateway(
  configuration: IdentityErasureConfiguration,
): IdentityErasureGateway {
  const fetch = configuration.fetch ?? globalThis.fetch;

  return {
    async eraseAdaptyProfile(userId) {
      const response = await fetch(
        "https://api.adapty.io/api/v2/server-side-api/profile/",
        {
          method: "DELETE",
          headers: {
            authorization: `Api-Key ${configuration.adaptySecretKey}`,
            "adapty-customer-user-id": userId,
          },
        },
      );
      requireSuccess(response, "Adapty", true);
    },

    async erasePosthogPerson(userId) {
      const host = configuration.posthogApiHost.replace(/\/$/, "");
      const response = await fetch(
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
      );
      requireSuccess(response, "PostHog");
      const result = await response.json().catch(() => null) as unknown;
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

    /**
     * GoTrue Admin API: `DELETE /auth/v1/admin/users/{id}` with the service
     * role key. A hard delete, so no `should_soft_delete` body — the account
     * must be gone, not merely marked.
     */
    async deleteAuthUser(userId) {
      const origin = configuration.supabaseUrl.replace(/\/+$/, "");
      const response = await fetch(
        `${origin}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            apikey: configuration.supabaseServiceRoleKey,
            authorization: `Bearer ${configuration.supabaseServiceRoleKey}`,
          },
        },
      );
      requireSuccess(response, "Supabase", true);
    },
  };
}
