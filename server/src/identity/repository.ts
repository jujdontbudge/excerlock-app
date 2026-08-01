export class DeletedIdentityError extends Error {
  constructor() {
    super("Deleted identity cannot be provisioned");
    this.name = "DeletedIdentityError";
  }
}

export interface IdentityRepository {
  ensureActiveUser(userId: string): Promise<void>;
}
