export type ApiFailureKind = 'offline' | 'timeout' | 'unauthenticated' | 'rejected' | 'unavailable';

/**
 * One error class for every server call. `kind` is what screens branch on: `offline` and
 * `timeout` never left the device or never came back, `rejected` is a 4xx the user cannot fix by
 * retrying, `unavailable` is a 5xx worth retrying later, `unauthenticated` means no live token.
 */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiFailureKind,
    readonly status: number | null = null,
    readonly code: string | null = null,
  ) {
    super(`API ${kind}${status === null ? '' : ` (${status}${code ? ` ${code}` : ''})`}`);
    this.name = 'ApiError';
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
