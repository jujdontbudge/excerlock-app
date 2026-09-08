import type { UserDeletionRepository } from "./repository.js";

export interface IdentityErasureGateway {
  eraseAdaptyProfile(userId: string): Promise<void>;
  erasePosthogPerson(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
}

export interface UserDeletionService {
  deleteAccount(userId: string): Promise<void>;
}

export function createUserDeletionService(options: {
  repository: UserDeletionRepository;
  downstream: IdentityErasureGateway;
  now?: () => Date;
}): UserDeletionService {
  const now = options.now ?? (() => new Date());

  return {
    async deleteAccount(userId) {
      const state = await options.repository.prepareDeletion(userId, now());

      if (!state.adaptyErasedAt) {
        await options.downstream.eraseAdaptyProfile(userId);
        await options.repository.markAdaptyErased(userId, now());
      }

      if (!state.posthogErasedAt) {
        await options.downstream.erasePosthogPerson(userId);
        await options.repository.markPosthogErased(userId, now());
      }

      // The auth provider is deliberately last. Until every data processor
      // confirms erasure, the authenticated caller must retain a credential
      // with which to retry this durable workflow.
      if (!state.authDeletedAt) {
        await options.downstream.deleteAuthUser(userId);
        await options.repository.markAuthDeleted(userId, now());
      }
    },
  };
}
