/**
 * The VPS half of the identity spine. Every Supabase session — the anonymous one included — is
 * attached to a `users` row by an idempotent `PUT /v1/user` carrying the access token.
 * `410 ACCOUNT_DELETED` is the server saying the id is gone for good, which is a different outcome
 * from an unreachable server: the first means start over, the second means try again later. Nothing
 * here touches earning or locking, so a failure only leaves the account boundary out of date
 * (ported from `app/src/account/ClerkAccountBridge.tsx`).
 *
 * Deletion is not here. `DELETE /v1/user` belongs to the runtime's VPS client, because the server
 * destroys the Supabase user through the Admin API that no client key can reach, and the adapter's
 * `deleteAccount` only clears this device afterwards.
 */
export type ProvisionOutcome = 'ok' | 'deleted' | 'failed';

export interface AccountProvisioning {
  /** Attaches the token's user to the server. Never throws: callers decide what a failure means. */
  provision(accessToken: string): Promise<ProvisionOutcome>;
}

export type AccountProvisioningConfig = {
  baseUrl: string;
  fetcher?: typeof fetch;
};

export function accountProvisioning({ baseUrl, fetcher = fetch }: AccountProvisioningConfig): AccountProvisioning {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/user`;
  return {
    provision: async (accessToken) => {
      try {
        const response = await fetcher(endpoint, {
          method: 'PUT',
          headers: { authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) return 'ok';
        return response.status === 410 ? 'deleted' : 'failed';
      } catch {
        return 'failed';
      }
    },
  };
}
