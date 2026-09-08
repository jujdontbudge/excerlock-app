import { ApiClient, failureFor } from './client';

export type UserApi = {
  /** `DELETE /v1/user`: resolves once the server has erased the account, or when it already had. */
  deleteUser(): Promise<void>;
};

/** Statuses that mean "there is nothing left to delete": the server row is gone either way. */
const ALREADY_DELETED = new Set([404, 410]);

export function createUserApi(client: ApiClient): UserApi {
  return {
    async deleteUser() {
      const response = await client.request('/v1/user', { method: 'DELETE' });
      if (response.status === 204 || ALREADY_DELETED.has(response.status)) return;
      throw failureFor(response);
    },
  };
}
