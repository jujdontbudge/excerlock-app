import type { IdentityErasureGateway } from "./service.js";

type Fetch = typeof globalThis.fetch;

export interface IdentityErasureConfiguration {
  clerkSecretKey: string;
  adaptySecretKey: string;
  posthogPersonalApiKey: string;
  posthogProjectId: string;
  posthogApiHost: string;
  fetch?: Fetch;
}

export class IdentityErasureRequestError extends Error {
  constructor(readonly processor: "Adapty" | "PostHog" | "Clerk") {
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

    async deleteClerkUser(userId) {
      const response = await fetch(
        `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${configuration.clerkSecretKey}`,
          },
        },
      );
      requireSuccess(response, "Clerk", true);
    },
  };
}
