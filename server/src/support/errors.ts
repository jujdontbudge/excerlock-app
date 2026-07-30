export class SupportUserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND";

  constructor(readonly userId: string) {
    super(`Unknown user: ${userId}`);
    this.name = "SupportUserNotFoundError";
  }
}
