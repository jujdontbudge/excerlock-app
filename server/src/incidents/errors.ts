export class IncidentUserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND";

  constructor(readonly userId: string) {
    super(`Unknown user: ${userId}`);
    this.name = "IncidentUserNotFoundError";
  }
}

/** The diagnostics document carried a key the app must never send. */
export class IncidentDiagnosticsRejectedError extends Error {
  readonly code = "DIAGNOSTICS_REJECTED";

  constructor(readonly path: string) {
    super(`Diagnostics contain a forbidden key at ${path}`);
    this.name = "IncidentDiagnosticsRejectedError";
  }
}
