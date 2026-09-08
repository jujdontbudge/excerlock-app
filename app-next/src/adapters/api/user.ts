import { ApiClient, failureFor } from './client';

/**
 * The account rows on the VPS, shaped after P2-T01's `AccountProvisioning` so the runtime composition
 * can hand these two calls to the Supabase auth adapter and the app ships one HTTP client.
 */
export type UserApi = {
  /** `PUT /v1/user`, idempotent provisioning. Never throws: a failure is "retry later". */
  putUser(accessToken?: string): Promise<'ok' | 'deleted' | 'failed'>;
  /** `DELETE /v1/user`: `ok` once the server has erased the account, `deleted` when it already had. */
  deleteUser(accessToken?: string): Promise<'ok' | 'deleted'>;
};

/** A tombstoned uid answers 410 to everything; 404 is the same fact from an older server. */
const ALREADY_DELETED = new Set([404, 410]);

export function createUserApi(client: ApiClient): UserApi {
  return {
    async putUser(accessToken) {
      try {
        const response = await client.request('/v1/user', { method: 'PUT', accessToken });
        if (response.status >= 200 && response.status < 300) return 'ok';
        return ALREADY_DELETED.has(response.status) ? 'deleted' : 'failed';
      } catch {
        return 'failed';
      }
    },
    async deleteUser(accessToken) {
      const response = await client.request('/v1/user', { method: 'DELETE', accessToken });
      if (response.status >= 200 && response.status < 300) return 'ok';
      if (ALREADY_DELETED.has(response.status)) return 'deleted';
      throw failureFor(response);
    },
  };
}
