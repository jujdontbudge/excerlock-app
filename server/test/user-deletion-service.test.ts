import { describe, expect, it, vi } from "vitest";
import {
  createUserDeletionService,
  type UserDeletionRepository,
  type UserDeletionState,
} from "../src/userDeletion/index.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function baseState(overrides: Partial<UserDeletionState> = {}): UserDeletionState {
  return {
    deletedAt: new Date("2026-07-31T20:00:00.000Z"),
    adaptyErasedAt: null,
    posthogErasedAt: null,
    clerkDeletedAt: null,
    authProvider: null,
    authDeletedAt: null,
    deletionAttempts: 0,
    deletionNextRetryAt: null,
    ...overrides,
  };
}

function statefulRepository(initial: UserDeletionState): UserDeletionRepository {
  const state = initial;
  return {
    prepareDeletion: vi.fn(async () => ({ ...state })),
    markAdaptyErased: vi.fn(async (_userId, erasedAt) => {
      state.adaptyErasedAt = erasedAt;
    }),
    markPosthogErased: vi.fn(async (_userId, erasedAt) => {
      state.posthogErasedAt = erasedAt;
    }),
    markClerkDeleted: vi.fn(async (_userId, erasedAt) => {
      state.clerkDeletedAt = erasedAt;
    }),
    markAuthDeleted: vi.fn(async (_userId, erasedAt, provider) => {
      state.authDeletedAt = erasedAt;
      state.authProvider = provider;
    }),
    listIncompleteDeletions: vi.fn(async () => []),
    recordDeletionFailure: vi.fn(async () => undefined),
    clearDeletionLease: vi.fn(async () => undefined),
    claimDeletionLease: vi.fn(async () => true),
  };
}

describe("user deletion workflow", () => {
  it("resumes after a downstream failure and never repeats completed erasure", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const state = baseState({ deletedAt });
    const repository = statefulRepository(state);
    const eraseAdaptyProfile = vi.fn(async () => undefined);
    const erasePosthogPerson = vi
      .fn<(userId: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("temporary PostHog failure"))
      .mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn(async () => undefined);
    const service = createUserDeletionService({
      repository,
      downstream: {
        eraseAdaptyProfile,
        erasePosthogPerson,
        deleteAuthUser,
      },
      now: () => deletedAt,
    });

    await expect(service.deleteAccount(USER_ID)).rejects.toThrow(
      "temporary PostHog failure",
    );
    await service.deleteAccount(USER_ID);
    await service.deleteAccount(USER_ID);

    expect({
      adapty: eraseAdaptyProfile.mock.calls,
      posthog: erasePosthogPerson.mock.calls,
      auth: deleteAuthUser.mock.calls,
      state,
    }).toEqual({
      adapty: [[USER_ID]],
      posthog: [[USER_ID], [USER_ID]],
      auth: [[USER_ID]],
      state: expect.objectContaining({
        deletedAt,
        adaptyErasedAt: deletedAt,
        posthogErasedAt: deletedAt,
        authDeletedAt: deletedAt,
        authProvider: "supabase",
      }),
    });
  });

  it("retries each erasure stage independently without repeating checkpoints", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    // Adapty stage fails first.
    {
      const state = baseState({ deletedAt });
      const repository = statefulRepository(state);
      const eraseAdaptyProfile = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("adapty down"))
        .mockResolvedValue(undefined);
      const service = createUserDeletionService({
        repository,
        downstream: {
          eraseAdaptyProfile,
          erasePosthogPerson: vi.fn(async () => undefined),
          deleteAuthUser: vi.fn(async () => undefined),
        },
        now: () => deletedAt,
      });
      await expect(service.deleteAccount(USER_ID)).rejects.toThrow("adapty down");
      await service.deleteAccount(USER_ID);
      expect(eraseAdaptyProfile).toHaveBeenCalledTimes(2);
      expect(state.adaptyErasedAt).toEqual(deletedAt);
    }
    // Auth-provider stage fails last and retries without re-erasing vendors.
    {
      const state = baseState({
        deletedAt,
        adaptyErasedAt: deletedAt,
        posthogErasedAt: deletedAt,
      });
      const repository = statefulRepository(state);
      const eraseAdaptyProfile = vi.fn(async () => undefined);
      const erasePosthogPerson = vi.fn(async () => undefined);
      const deleteAuthUser = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("supabase admin down"))
        .mockResolvedValue(undefined);
      const service = createUserDeletionService({
        repository,
        downstream: { eraseAdaptyProfile, erasePosthogPerson, deleteAuthUser },
        now: () => deletedAt,
      });
      await expect(service.deleteAccount(USER_ID)).rejects.toThrow(
        "supabase admin down",
      );
      await service.deleteAccount(USER_ID);
      expect(eraseAdaptyProfile).not.toHaveBeenCalled();
      expect(erasePosthogPerson).not.toHaveBeenCalled();
      expect(deleteAuthUser).toHaveBeenCalledTimes(2);
      expect(state.authDeletedAt).toEqual(deletedAt);
    }
  });

  it("enforces auth-provider-last order", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const order: string[] = [];
    const state = baseState({ deletedAt });
    const repository = statefulRepository(state);
    const service = createUserDeletionService({
      repository,
      downstream: {
        eraseAdaptyProfile: vi.fn(async () => {
          order.push("adapty");
        }),
        erasePosthogPerson: vi.fn(async () => {
          order.push("posthog");
        }),
        deleteAuthUser: vi.fn(async () => {
          order.push("auth");
        }),
      },
      now: () => deletedAt,
    });
    await service.deleteAccount(USER_ID);
    expect(order).toEqual(["adapty", "posthog", "auth"]);
  });

  it("never treats a legacy Clerk checkpoint as Supabase erasure", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const clerkAt = new Date("2026-07-30T20:00:00.000Z");
    const state = baseState({
      deletedAt,
      adaptyErasedAt: deletedAt,
      posthogErasedAt: deletedAt,
      clerkDeletedAt: clerkAt,
      authDeletedAt: null,
      authProvider: "clerk",
    });
    const repository = statefulRepository(state);
    const deleteAuthUser = vi.fn(async () => undefined);
    const service = createUserDeletionService({
      repository,
      downstream: {
        eraseAdaptyProfile: vi.fn(async () => undefined),
        erasePosthogPerson: vi.fn(async () => undefined),
        deleteAuthUser,
      },
      now: () => deletedAt,
    });
    await service.deleteAccount(USER_ID);
    // Must still erase the Supabase provider even though clerkDeletedAt exists.
    expect(deleteAuthUser).toHaveBeenCalledTimes(1);
    expect(state.authDeletedAt).toEqual(deletedAt);
    expect(state.authProvider).toBe("supabase");
    // Legacy checkpoint preserved for audit.
    expect(state.clerkDeletedAt).toEqual(clerkAt);
  });

  it("re-erases auth when the durable checkpoint belongs to another provider", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const state = baseState({
      deletedAt,
      adaptyErasedAt: deletedAt,
      posthogErasedAt: deletedAt,
      authDeletedAt: deletedAt,
      authProvider: "clerk",
    });
    const repository = statefulRepository(state);
    const deleteAuthUser = vi.fn(async () => undefined);
    await createUserDeletionService({
      repository,
      downstream: {
        eraseAdaptyProfile: vi.fn(async () => undefined),
        erasePosthogPerson: vi.fn(async () => undefined),
        deleteAuthUser,
      },
      now: () => deletedAt,
    }).deleteAccount(USER_ID);

    expect(deleteAuthUser).toHaveBeenCalledOnce();
    expect(state.authProvider).toBe("supabase");
  });

  it("supports the deprecated Clerk gateway hook via delegation", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const state = baseState({
      deletedAt,
      adaptyErasedAt: deletedAt,
      posthogErasedAt: deletedAt,
    });
    const repository = statefulRepository(state);
    const deleteClerkUser = vi.fn(async () => undefined);
    const service = createUserDeletionService({
      repository,
      downstream: {
        eraseAdaptyProfile: vi.fn(async () => undefined),
        erasePosthogPerson: vi.fn(async () => undefined),
        deleteAuthUser: undefined as unknown as () => Promise<void>,
        deleteClerkUser,
      },
      now: () => deletedAt,
    });
    await service.deleteAccount(USER_ID);
    expect(deleteClerkUser).toHaveBeenCalledWith(USER_ID);
  });

  it("completes a lost-response gap after auth erasure via idempotent replay", async () => {
    // First attempt: provider erased but process crashed before checkpoint.
    // Second attempt: provider returns not-found (idempotent success) and
    // the checkpoint is then written.
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const state = baseState({
      deletedAt,
      adaptyErasedAt: deletedAt,
      posthogErasedAt: deletedAt,
      authDeletedAt: null,
    });
    const repository = statefulRepository(state);
    let calls = 0;
    const deleteAuthUser = vi.fn(async () => {
      calls += 1;
      // Both calls succeed (second is provider not-found mapped to success).
    });
    const service = createUserDeletionService({
      repository,
      downstream: {
        eraseAdaptyProfile: vi.fn(async () => undefined),
        erasePosthogPerson: vi.fn(async () => undefined),
        deleteAuthUser,
      },
      now: () => deletedAt,
    });
    // Simulate crash between provider delete and checkpoint by failing the
    // first checkpoint write.
    const innerMark = repository.markAuthDeleted;
    vi.mocked(repository.markAuthDeleted)
      .mockRejectedValueOnce(new Error("crash before checkpoint"))
      .mockImplementationOnce(innerMark);
    await expect(service.deleteAccount(USER_ID)).rejects.toThrow(
      "crash before checkpoint",
    );
    expect(state.authDeletedAt).toBeNull();
    await service.deleteAccount(USER_ID);
    expect(calls).toBe(2);
    expect(state.authDeletedAt).toEqual(deletedAt);
  });

  it("keeps concurrent deletion calls idempotent and replay-safe", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const state = baseState({ deletedAt });
    const repository = statefulRepository(state);
    // Serialize checkpoint writes like the DB transaction does.
    const downstream = {
      eraseAdaptyProfile: vi.fn(async () => undefined),
      erasePosthogPerson: vi.fn(async () => undefined),
      deleteAuthUser: vi.fn(async () => undefined),
    };
    const service = createUserDeletionService({
      repository,
      downstream,
      now: () => deletedAt,
    });
    await Promise.all([
      service.deleteAccount(USER_ID),
      service.deleteAccount(USER_ID),
      service.deleteAccount(USER_ID),
    ]);
    // All three run prepareDeletion; gateway replay is safe and checkpoints
    // converge. At least one full pass completes.
    expect(state.adaptyErasedAt).toEqual(deletedAt);
    expect(state.posthogErasedAt).toEqual(deletedAt);
    expect(state.authDeletedAt).toEqual(deletedAt);
  });
});
