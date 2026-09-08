import { AuthPort } from '../../ports/AuthPort';
import { UserApi } from './user';

/**
 * Account deletion is the server's ordered erasure (Adapty, PostHog, then the auth user) followed by
 * the local session teardown. The server goes first because it needs the live access token; if it
 * fails nothing local changes, so the user can retry from the same signed-in state. The local
 * `deleteAccount` then only signs out and starts a fresh anonymous session, keeping local data (D5).
 */
export function withServerDeletion(auth: AuthPort, api: UserApi): AuthPort {
  return {
    ...auth,
    session: () => auth.session(),
    subscribe: (callback) => auth.subscribe(callback),
    async deleteAccount() {
      await api.deleteUser();
      await auth.deleteAccount();
    },
  };
}
