import { ApiClient } from './client';
import { createUserApi } from './user';

export type ProvisionOutcome = 'ok' | 'deleted' | 'failed';

/**
 * Structurally identical to `src/auth/accountProvisioning.ts`'s `AccountProvisioning` (P2-T01), so
 * the runtime composition can hand the Supabase auth adapter this object built on the one HTTP
 * client. The adapter calls `provision` on every session and `remove` inside `deleteAccount()`,
 * before its local teardown; `AuthPort.deleteAccount()` therefore still means the account is gone.
 */
export type VpsProvisioning = {
  /** `PUT /v1/user`. Never throws: `failed` is "retry later", `deleted` is a tombstoned uid. */
  provision(accessToken: string): Promise<ProvisionOutcome>;
  /** `DELETE /v1/user`. `ok` or `deleted` (already gone); throws an `ApiError` the screen can explain. */
  remove(accessToken: string): Promise<'ok' | 'deleted'>;
};

export function createVpsProvisioning(client: ApiClient): VpsProvisioning {
  const users = createUserApi(client);
  return {
    provision: (accessToken) => users.putUser(accessToken),
    remove: (accessToken) => users.deleteUser(accessToken),
  };
}
