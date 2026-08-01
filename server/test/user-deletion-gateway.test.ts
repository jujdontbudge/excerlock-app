import { describe, expect, it, vi } from "vitest";
import { createIdentityErasureGateway } from "../src/userDeletion/index.js";

describe("identity erasure HTTP gateway", () => {
  it("deletes the Adapty profile by the shared customer user id", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const gateway = createIdentityErasureGateway({
      clerkSecretKey: "clerk-secret",
      adaptySecretKey: "adapty-secret",
      posthogPersonalApiKey: "posthog-secret",
      posthogProjectId: "project-id",
      posthogApiHost: "https://us.posthog.com",
      fetch,
    });

    await gateway.eraseAdaptyProfile("user_123");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.adapty.io/api/v2/server-side-api/profile/",
      {
        method: "DELETE",
        headers: {
          authorization: "Api-Key adapty-secret",
          "adapty-customer-user-id": "user_123",
        },
      },
    );
  });

  it("does not checkpoint a partially rejected PostHog deletion", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        {
          persons_found: 1,
          persons_deleted: 0,
          events_queued_for_deletion: false,
          recordings_queued_for_deletion: false,
          deletion_errors: [{ person_uuid: "private-vendor-id" }],
        },
        { status: 202 },
      ),
    );
    const gateway = createIdentityErasureGateway({
      clerkSecretKey: "clerk-secret",
      adaptySecretKey: "adapty-secret",
      posthogPersonalApiKey: "posthog-secret",
      posthogProjectId: "project-id",
      posthogApiHost: "https://us.posthog.com/",
      fetch,
    });

    await expect(gateway.erasePosthogPerson("user_123")).rejects.toThrow(
      "PostHog identity erasure did not succeed",
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://us.posthog.com/api/projects/project-id/persons/bulk_delete/",
      {
        method: "POST",
        headers: {
          authorization: "Bearer posthog-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          distinct_ids: ["user_123"],
          delete_events: true,
          delete_recordings: true,
        }),
      },
    );
  });

  it("queues PostHog person, event, and recording erasure by distinct id", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        {
          persons_found: 1,
          persons_deleted: 1,
          events_queued_for_deletion: true,
          recordings_queued_for_deletion: true,
          deletion_errors: [],
        },
        { status: 202 },
      ),
    );
    const gateway = createIdentityErasureGateway({
      clerkSecretKey: "clerk-secret",
      adaptySecretKey: "adapty-secret",
      posthogPersonalApiKey: "posthog-secret",
      posthogProjectId: "project-id",
      posthogApiHost: "https://us.posthog.com",
      fetch,
    });

    await gateway.erasePosthogPerson("user_123");

    expect(fetch).toHaveBeenCalledWith(
      "https://us.posthog.com/api/projects/project-id/persons/bulk_delete/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          distinct_ids: ["user_123"],
          delete_events: true,
          delete_recordings: true,
        }),
      }),
    );
  });

  it("treats an already absent Clerk user as a successful retry", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    const gateway = createIdentityErasureGateway({
      clerkSecretKey: "clerk-secret",
      adaptySecretKey: "adapty-secret",
      posthogPersonalApiKey: "posthog-secret",
      posthogProjectId: "project-id",
      posthogApiHost: "https://us.posthog.com",
      fetch,
    });

    await gateway.deleteClerkUser("user_123");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.clerk.com/v1/users/user_123",
      {
        method: "DELETE",
        headers: { authorization: "Bearer clerk-secret" },
      },
    );
  });
});
