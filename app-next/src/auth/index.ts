import { AccountProvisioning } from './accountProvisioning';
import { appleIdentity, googleIdentity } from './identityProviders';
import { createSupabaseAuth, SupabaseAuth } from './SupabaseAuthAdapter';
import { authConfig, createSupabaseAuthApi } from './supabaseClient';

export { AccountDeletedError, createSupabaseAuth, toSession } from './SupabaseAuthAdapter';
export type { SupabaseAuth, SupabaseAuthDeps } from './SupabaseAuthAdapter';
export { appleIdentity, googleIdentity } from './identityProviders';
export type { NativeIdentityProvider } from './identityProviders';
export { authConfig } from './supabaseClient';
export type { AuthConfig } from './supabaseClient';

/**
 * The real `AuthPort`, assembled from the build's configuration. A build without Supabase keys gets
 * `null`, and the runtime keeps the local session it already has: an account never gates earning or
 * locking, so a missing key must not stop the app.
 *
 * `account` is required, not defaulted. The VPS half of the identity spine is one HTTP call against
 * the same server every other call goes to, so the composition root hands over
 * `adapters/api`'s `createVpsProvisioning` rather than this module keeping a second client.
 */
export function supabaseAuth({ account }: { account: AccountProvisioning }): SupabaseAuth | null {
  const config = authConfig();
  if (!config) return null;
  return createSupabaseAuth({
    client: createSupabaseAuthApi(config),
    apple: appleIdentity(),
    google: googleIdentity({
      webClientId: config.googleWebClientId,
      iosClientId: config.googleIosClientId,
    }),
    account,
  });
}
