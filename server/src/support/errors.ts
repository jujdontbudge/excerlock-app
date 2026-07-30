export class SupportUserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND";

  constructor(readonly userId: string) {
    super(`Unknown user: ${userId}`);
    this.name = "SupportUserNotFoundError";
  }
}

export class FeatureRequestNotFoundError extends Error {
  readonly code = "FEATURE_REQUEST_NOT_FOUND";

  constructor(readonly featureRequestId: string) {
    super(`Unknown feature request: ${featureRequestId}`);
    this.name = "FeatureRequestNotFoundError";
  }
}
