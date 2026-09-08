import { describe, expect, it, vi } from "vitest";
import {
  createUserDeletionService,
  type UserDeletionRepository,
  type UserDeletionState,
} from "../src/userDeletion/index.js";

describe("user deletion workflow", () => {
  it("resumes after a downstream failure and never repeats completed erasure", async () => {
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const state: UserDeletionState = {
      deletedAt,
      adaptyErasedAt: null,
      posthogErasedAt: null,
      authDeletedAt: null,
    };
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

    await expect(service.deleteAccount("user_123")).rejects.toThrow(
      "temporary PostHog failure",
    );
    await service.deleteAccount("user_123");
    await service.deleteAccount("user_123");

    expect({
      adapty: eraseAdaptyProfile.mock.calls,
      posthog: erasePosthogPerson.mock.calls,
      auth: deleteAuthUser.mock.calls,
      state,
    }).toEqual({
      adapty: [["user_123"]],
      posthog: [["user_123"], ["user_123"]],
      auth: [["user_123"]],
      state: {
        deletedAt,
        adaptyErasedAt: deletedAt,
        posthogErasedAt: deletedAt,
        authDeletedAt: deletedAt,
      },
    });
  });
});

function statefulRepository(
  state: UserDeletionState,
): UserDeletionRepository {
  return {
    prepareDeletion: vi.fn(async () => ({ ...state })),
    markAdaptyErased: vi.fn(async (_userId, erasedAt) => {
      state.adaptyErasedAt = erasedAt;
    }),
    markPosthogErased: vi.fn(async (_userId, erasedAt) => {
      state.posthogErasedAt = erasedAt;
    }),
    markAuthDeleted: vi.fn(async (_userId, erasedAt) => {
      state.authDeletedAt = erasedAt;
    }),
  };
}
