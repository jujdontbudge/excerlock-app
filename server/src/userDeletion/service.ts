import type {
  AuthErasureProvider,
  UserDeletionRepository,
} from "./repository.js";

export interface IdentityErasureGateway {
  eraseAdaptyProfile(userId: string): Promise<void>;
  erasePosthogPerson(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  /**
   * @deprecated Legacy Clerk hook. Implementations must delegate to
   * deleteAuthUser; new code calls deleteAuthUser directly.
   */
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
      const state = await options.repository.prepareDeletion(userId, now());

      if (!state.adaptyErasedAt) {
        await options.downstream.eraseAdaptyProfile(userId);
        await options.repository.markAdaptyErased(userId, now());
      }

      if (!state.posthogErasedAt) {
        await options.downstream.erasePosthogPerson(userId);
        await options.repository.markPosthogErased(userId, now());
      }

      // Auth provider is deliberately last. Until every data processor
      // confirms erasure, the authenticated caller must retain a credential
      // with which to retry this durable workflow. The durable retry worker
      // finishes the provider-last gap without a client token: provider
      // not-found is idempotent success, so a lost response after auth
      // erasure still checkpoints on retry.
      //
      // Legacy clerkDeletedAt is never treated as Supabase erasure; only
      // authDeletedAt with the active provider completes this step.
      if (!state.authDeletedAt || state.authProvider !== authProvider) {
        await deleteAuthUser(userId);
        await options.repository.markAuthDeleted(userId, now(), authProvider);
      }
    },
  };
}
