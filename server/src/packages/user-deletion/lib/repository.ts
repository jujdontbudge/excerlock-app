export type AuthErasureProvider = "supabase" | "clerk";
export interface DeletionRetryCandidate { userId: string; attempts: number }

export interface UserDeletionState {
  deletedAt: Date;
  adaptyErasedAt: Date | null;
  posthogErasedAt: Date | null;
  authProvider: AuthErasureProvider | string | null;
  authDeletedAt: Date | null;
  deletionAttempts: number;
  deletionNextRetryAt: Date | null;
}

export interface UserDeletionRepository {
  prepareDeletion(userId: string, deletedAt: Date, provider?: AuthErasureProvider | string): Promise<UserDeletionState>;
  markAdaptyErased(userId: string, erasedAt: Date): Promise<void>;
  markPosthogErased(userId: string, erasedAt: Date): Promise<void>;
  markAuthDeleted(
    userId: string,
    deletedAt: Date,
    provider: AuthErasureProvider | string,
  ): Promise<void>;
  listIncompleteDeletions(limit: number, now?: Date): Promise<DeletionRetryCandidate[]>;
  recordDeletionFailure(
    userId: string,
    failedAt: Date,
    nextRetryAt: Date,
    sanitizedError: string,
    ownerId: string,
  ): Promise<void>;
  clearDeletionLease(userId: string, ownerId: string): Promise<void>;
  claimDeletionLease(
    userId: string,
    ownerId: string,
    claimedAt: Date,
    expiresAt: Date,
  ): Promise<boolean>;
}
