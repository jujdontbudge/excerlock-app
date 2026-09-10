import { describe, expect, it, vi } from "vitest";
import {
  createDeletionRetryWorker,
  type UserDeletionRepository,
  type UserDeletionState,
} from "../src/userDeletion/index.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function durableRepository(): UserDeletionRepository {
  const state: UserDeletionState = {
    deletedAt: new Date("2026-07-31T20:00:00.000Z"),
    adaptyErasedAt: null,
    posthogErasedAt: null,
    clerkDeletedAt: null,
    authProvider: null,
    authDeletedAt: null,
    deletionAttempts: 0,
    deletionNextRetryAt: null,
  };
  let leaseOwner: string | null = null;
  let leaseExpiresAt: Date | null = null;
  return {
    prepareDeletion: vi.fn(async () => ({ ...state })),
    markAdaptyErased: vi.fn(async (_id, at) => { state.adaptyErasedAt = at; }),
    markPosthogErased: vi.fn(async (_id, at) => { state.posthogErasedAt = at; }),
    markClerkDeleted: vi.fn(async (_id, at) => { state.clerkDeletedAt = at; }),
    markAuthDeleted: vi.fn(async (_id, at, provider) => {
      state.authDeletedAt = at;
      state.authProvider = provider;
    }),
    listIncompleteDeletions: vi.fn(async () =>
      state.authDeletedAt ? [] : [{ userId: USER_ID, attempts: state.deletionAttempts }]),
    recordDeletionFailure: vi.fn(async (_id, _failed, nextRetry, _error, owner) => {
      if (leaseOwner !== owner) return;
      state.deletionAttempts += 1;
      state.deletionNextRetryAt = nextRetry;
      leaseOwner = null;
      leaseExpiresAt = null;
    }),
    clearDeletionLease: vi.fn(async (_id, owner) => {
      if (leaseOwner !== owner) return;
      leaseOwner = null;
      leaseExpiresAt = null;
    }),
    claimDeletionLease: vi.fn(async (_id, owner, claimedAt, expiresAt) => {
      if (leaseOwner && leaseExpiresAt && leaseExpiresAt > claimedAt) return false;
      leaseOwner = owner;
      leaseExpiresAt = expiresAt;
      return true;
    }),
  };
}

describe("durable deletion retry worker", () => {
  it("allows only one concurrent replica to process the same tombstone", async () => {
    const repository = durableRepository();
    const downstream = {
      eraseAdaptyProfile: vi.fn(async () => undefined),
      erasePosthogPerson: vi.fn(async () => undefined),
      deleteAuthUser: vi.fn(async () => undefined),
    };
    const now = () => new Date("2026-07-31T20:01:00.000Z");
    const first = createDeletionRetryWorker({
      repository, downstream, ownerId: "replica-a", now,
    });
    const second = createDeletionRetryWorker({
      repository, downstream, ownerId: "replica-b", now,
    });

    const results = await Promise.all([first.runOnce(), second.runOnce()]);

    expect(results.flatMap((result) => result.processed)).toEqual([USER_ID]);
    expect(downstream.eraseAdaptyProfile).toHaveBeenCalledOnce();
    expect(downstream.erasePosthogPerson).toHaveBeenCalledOnce();
    expect(downstream.deleteAuthUser).toHaveBeenCalledOnce();
  });

  it("retains transient failures for a later unauthenticated retry", async () => {
    const repository = durableRepository();
    const downstream = {
      eraseAdaptyProfile: vi.fn(async () => undefined),
      erasePosthogPerson: vi.fn(async () => undefined),
      deleteAuthUser: vi.fn().mockRejectedValueOnce(new Error("provider unavailable")),
    };
    const worker = createDeletionRetryWorker({
      repository,
      downstream,
      ownerId: "replica-a",
      now: () => new Date("2026-07-31T20:01:00.000Z"),
    });

    expect(await worker.runOnce()).toEqual({ processed: [], failures: [USER_ID] });
    expect(repository.recordDeletionFailure).toHaveBeenCalledWith(
      USER_ID,
      expect.any(Date),
      expect.any(Date),
      "provider unavailable",
      "replica-a",
    );
  });

  it("increases retry delay using persisted attempt count", async () => {
    const repository = durableRepository();
    const downstream = {
      eraseAdaptyProfile: vi.fn(async () => undefined),
      erasePosthogPerson: vi.fn(async () => undefined),
      deleteAuthUser: vi.fn(async () => { throw new Error("provider unavailable"); }),
    };
    const current = new Date("2026-07-31T20:01:00.000Z");
    const worker = createDeletionRetryWorker({
      repository, downstream, ownerId: "replica-a", now: () => current,
    });
    await worker.runOnce();
    await worker.runOnce();
    const calls = vi.mocked(repository.recordDeletionFailure).mock.calls;
    expect(calls[0]?.[2].getTime() - current.getTime()).toBeLessThan(60_000);
    expect(calls[1]?.[2].getTime() - current.getTime()).toBeGreaterThanOrEqual(60_000);
  });

  it("cancels the startup tick on stop", async () => {
    vi.useFakeTimers();
    try {
      const repository = durableRepository();
      const worker = createDeletionRetryWorker({
        repository,
        downstream: {
          eraseAdaptyProfile: vi.fn(async () => undefined),
          erasePosthogPerson: vi.fn(async () => undefined),
          deleteAuthUser: vi.fn(async () => undefined),
        },
        intervalMs: 10_000,
      });
      worker.start();
      worker.stop();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(repository.listIncompleteDeletions).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
