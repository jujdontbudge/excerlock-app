/**
 * The VPS half of the identity spine. Every Supabase session — the anonymous one included — is
 * attached to a `users` row by an idempotent `PUT /v1/user` carrying the access token, and the row
 * is destroyed by `DELETE /v1/user`. `410 ACCOUNT_DELETED` is the server saying the id is gone for
 * good, which is a different outcome from an unreachable server: the first means start over, the
 * second means try again later. Nothing here touches earning or locking, so a failure only leaves
 * the account boundary out of date (ported from `app/src/account/ClerkAccountBridge.tsx`).
 */
export type ProvisionOutcome = 'ok' | 'deleted' | 'failed';

export interface AccountProvisioning {
  /** Attaches the token's user to the server. Never throws: callers decide what a failure means. */
  provision(accessToken: string): Promise<ProvisionOutcome>;
  /**
   * Destroys the token's user. `deleted` means the server had already done it, which is a success
   * for the caller. Throws when the server could not be reached or refused, so nothing local moves
   * on a deletion that did not happen.
   */
  remove(accessToken: string): Promise<'ok' | 'deleted'>;
}
