import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

/**
 * The two native sheets reduced to one shape: hand back an OIDC id token, or say the person backed
 * out. Supabase turns the token into a session; nothing above this line knows which SDK produced it.
 * A cancelled sheet is an outcome, not a failure — the sign-in screen must not show an error for it.
 */
export type NativeCredential = { token: string; email: string | null };

export interface NativeIdentityProvider {
  isAvailable(): Promise<boolean>;
  requestToken(): Promise<NativeCredential | 'cancelled'>;
}

/**
 * A provider this build cannot run. It refuses rather than reporting a cancellation, because a
 * cancellation means the person backed out and this is the app being misconfigured.
 */
const unconfigured = (name: string): NativeIdentityProvider => ({
  isAvailable: async () => false,
  requestToken: async () => {
    throw new Error(`Sign in with ${name} is not available in this build`);
  },
});

/**
 * Sign in with Apple through `expo-apple-authentication`. Apple returns the full name only on the
 * first authorization and never inside the identity token, so the token is all we forward; the name
 * is not part of ExcerLock's model. Cancelling raises `ERR_REQUEST_CANCELED`.
 */
export function appleIdentity(): NativeIdentityProvider {
  if (Platform.OS !== 'ios') return unconfigured('Apple');
  return {
    isAvailable: async () => {
      try {
        return await AppleAuthentication.isAvailableAsync();
      } catch {
        return false;
      }
    },
    requestToken: async () => {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) throw new Error('Apple returned no identity token');
        return { token: credential.identityToken, email: credential.email ?? null };
      } catch (cause) {
        if ((cause as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancelled';
        throw cause;
      }
    },
  };
}

/**
 * Sign in with Google through `@react-native-google-signin/google-signin`. iOS needs both client
 * ids — the web one is the token audience Supabase checks, the iOS one is what opens the sheet, and
 * there is no `GoogleService-Info.plist` here to supply it. A build missing either says so rather
 * than failing at the sheet.
 */
export function googleIdentity(config: { webClientId?: string; iosClientId?: string }): NativeIdentityProvider {
  if (!config.webClientId || !config.iosClientId) return unconfigured('Google');
  let configured = false;
  const configure = () => {
    if (configured) return;
    GoogleSignin.configure({ webClientId: config.webClientId, iosClientId: config.iosClientId });
    configured = true;
  };
  return {
    isAvailable: async () => true,
    requestToken: async () => {
      configure();
      try {
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return 'cancelled';
        const { idToken, user } = response.data;
        if (!idToken) throw new Error('Google returned no identity token');
        return { token: idToken, email: user.email ?? null };
      } catch (cause) {
        const code = (cause as { code?: string }).code;
        if (code === statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
        throw cause;
      }
    },
  };
}
