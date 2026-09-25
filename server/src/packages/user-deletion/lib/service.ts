import type {
  AuthErasureProvider,
  UserDeletionRepository,
} from "./repository.js";

export interface IdentityErasureGateway {
  eraseAdaptyProfile(userId: string): Promise<void>;
  erasePosthogPerson(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
}

export interface UserDeletionService {
  deleteAccount(userId: string): Promise<void>;
}

export interface UserDeletionServiceOptions {
  repository: UserDeletionRepository;
  downstream: IdentityErasureGateway;
  authProvider?: AuthErasureProvider | string;
  now?: () => Date;
}

export function createUserDeletionService(options: UserDeletionServiceOptions): UserDeletionService {
  const now = options.now ?? (() => new Date());
  const authProvider = options.authProvider ?? "supabase";

  return {
    async deleteAccount(userId) {
      const state = await options.repository.prepareDeletion(userId, now(), authProvider);

      if (!state.adaptyErasedAt) {
        await options.downstream.eraseAdaptyProfile(userId);
        await options.repository.markAdaptyErased(userId, now());
      }

      if (!state.posthogErasedAt) {
        await options.downstream.erasePosthogPerson(userId);
        await options.repository.markPosthogErased(userId, now());
      }

      if (!state.authDeletedAt || state.authProvider !== authProvider) {
        await options.downstream.deleteAuthUser(userId);
        await options.repository.markAuthDeleted(userId, now(), authProvider);
      }
    },
  };
}
