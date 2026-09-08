export class DeletedIdentityError extends Error {
  constructor() {
    super("Deleted identity cannot be provisioned");
    this.name = "DeletedIdentityError";
  }
}

export interface IdentityRecord {
  createdAt: Date;
  deletedAt: Date | null;
}

export interface IdentityRepository {
  ensureActiveUser(userId: string): Promise<void>;
  /** Null when the account was never provisioned on this server. */
  findUser(userId: string): Promise<IdentityRecord | null>;
}
