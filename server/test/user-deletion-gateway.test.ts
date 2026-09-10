import { describe, expect, it, vi } from "vitest";
import {
  createIdentityErasureGateway,
  supabaseAdminUserUrl,
} from "../src/userDeletion/index.js";

const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_UUID = "550e8400-e29b-41d4-a716-446655440000";

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    adaptySecretKey: "adapty-secret",
    posthogPersonalApiKey: "posthog-secret",
    posthogProjectId: "project-id",
    posthogApiHost: "https://us.posthog.com",
    supabaseUrl: SUPABASE_URL,
    supabaseServiceRoleKey: "service-role-for-test-only",
    ...overrides,
  };
}

describe("identity erasure HTTP gateway", () => {
  it("deletes the Adapty profile by the shared customer user id", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });

    await gateway.eraseAdaptyProfile(SUPABASE_UUID);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.adapty.io/api/v2/server-side-api/profile/",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          authorization: "Api-Key adapty-secret",
          "adapty-customer-user-id": SUPABASE_UUID,
        },
      }),
    );
  });

  it("treats an already absent Adapty profile as success", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });
    await expect(
      gateway.eraseAdaptyProfile(SUPABASE_UUID),
    ).resolves.toBeUndefined();
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
      ...baseConfig({ posthogApiHost: "https://us.posthog.com/" }),
      fetch,
    });

    await expect(
      gateway.erasePosthogPerson(SUPABASE_UUID),
    ).rejects.toThrow("PostHog identity erasure did not succeed");
    expect(fetch).toHaveBeenCalledWith(
      "https://us.posthog.com/api/projects/project-id/persons/bulk_delete/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          distinct_ids: [SUPABASE_UUID],
          delete_events: true,
          delete_recordings: true,
        }),
      }),
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
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });

    await gateway.erasePosthogPerson(SUPABASE_UUID);

    expect(fetch).toHaveBeenCalledWith(
      "https://us.posthog.com/api/projects/project-id/persons/bulk_delete/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          distinct_ids: [SUPABASE_UUID],
          delete_events: true,
          delete_recordings: true,
        }),
      }),
    );
  });

  it("deletes the Supabase auth user via the admin endpoint", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });

    await gateway.deleteAuthUser(SUPABASE_UUID);

    expect(fetch).toHaveBeenCalledWith(
      supabaseAdminUserUrl(SUPABASE_URL, SUPABASE_UUID),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          authorization: "Bearer service-role-for-test-only",
        }),
      }),
    );
    // Service-role key travels only in headers, never in URL or body.
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("service-role-for-test-only");
    expect(JSON.stringify(init)).not.toContain("private-vendor");
  });

  it("treats an already absent Supabase user as a successful retry", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });

    await expect(
      gateway.deleteAuthUser(SUPABASE_UUID),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      `https://xyzcompany.supabase.co/auth/v1/admin/users/${SUPABASE_UUID}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("fails Supabase erasure on non-404 errors without leaking secrets", async () => {
    const fetch = vi.fn(async () => new Response("boom", { status: 500 }));
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });
    const error = await gateway
      .deleteAuthUser(SUPABASE_UUID)
      .then(
        () => null,
        (err: unknown) => err as Error,
      );
    expect(error?.message).toBe("Supabase identity erasure did not succeed");
    expect(error?.message).not.toContain("service-role-for-test-only");
    expect(error?.message).not.toContain(SUPABASE_UUID.slice(0, 8));
  });

  it("applies a per-operation timeout signal", async () => {
    let observedSignal: AbortSignal | undefined;
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      observedSignal = init?.signal as AbortSignal | undefined;
      return new Response(null, { status: 204 });
    });
    const gateway = createIdentityErasureGateway({
      ...baseConfig(),
      fetch,
      timeoutMs: 5_000,
    });
    await gateway.deleteAuthUser(SUPABASE_UUID);
    expect(observedSignal).toBeDefined();
  });

  it("keeps the deprecated Clerk hook for explicit legacy retries", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    const gateway = createIdentityErasureGateway({
      ...baseConfig({ clerkSecretKey: "clerk-secret-for-test-only" }),
      fetch,
    });

    await gateway.deleteClerkUser?.("user_123");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.clerk.com/v1/users/user_123",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("delegates the deprecated Clerk hook to Supabase when no Clerk secret is configured", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const gateway = createIdentityErasureGateway({ ...baseConfig(), fetch });
    await gateway.deleteClerkUser?.(SUPABASE_UUID);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/v1/admin/users/"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
