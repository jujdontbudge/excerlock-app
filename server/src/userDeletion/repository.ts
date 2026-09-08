export interface UserDeletionState {
  deletedAt: Date;
  adaptyErasedAt: Date | null;
  posthogErasedAt: Date | null;
  authDeletedAt: Date | null;
}

export interface UserDeletionRepository {
  prepareDeletion(userId: string, deletedAt: Date): Promise<UserDeletionState>;
  markAdaptyErased(userId: string, erasedAt: Date): Promise<void>;
  markPosthogErased(userId: string, erasedAt: Date): Promise<void>;
  markAuthDeleted(userId: string, deletedAt: Date): Promise<void>;
}
