import type {
  AuthErasureProvider,
  UserDeletionRepository,
} from "./repository.js";

export interface IdentityErasureGateway {
  eraseAdaptyProfile(userId: string): Promise<void>;
  erasePosthogPerson(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  deleteClerkUser?(userId: string): Promise<void>;
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

function resolveDeleteAuthUser(
  downstream: IdentityErasureGateway,
): (userId: string) => Promise<void> {
  if (typeof downstream.deleteAuthUser === "function") {
    return (userId) => downstream.deleteAuthUser(userId);
  }
  const legacy = downstream.deleteClerkUser;
  if (typeof legacy === "function") {
    return (userId) => legacy.call(downstream, userId);
  }
  throw new Error("Identity erasure gateway is missing deleteAuthUser");
}

export function createUserDeletionService(options: {
  repository: UserDeletionRepository;
  downstream: IdentityErasureGateway;
  authProvider?: AuthErasureProvider | string;
  now?: () => Date;
}): UserDeletionService {
  const now = options.now ?? (() => new Date());
  const authProvider = options.authProvider ?? "supabase";
  const deleteAuthUser = resolveDeleteAuthUser(options.downstream);

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
        await deleteAuthUser(userId);
        await options.repository.markAuthDeleted(userId, now(), authProvider);
      }
    },
  };
}
