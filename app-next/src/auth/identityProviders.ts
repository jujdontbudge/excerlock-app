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

const unavailable: NativeIdentityProvider = {
  isAvailable: async () => false,
  requestToken: async () => 'cancelled',
};

/**
 * Sign in with Apple through `expo-apple-authentication`. Apple returns the full name only on the
 * first authorization and never inside the identity token, so the token is all we forward; the name
 * is not part of ExcerLock's model. Cancelling raises `ERR_REQUEST_CANCELED`.
 */
export function appleIdentity(): NativeIdentityProvider {
  if (Platform.OS !== 'ios') return unavailable;
  const load = () => require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  return {
    isAvailable: async () => {
      try {
        return await load().isAvailableAsync();
      } catch {
        return false;
      }
    },
    requestToken: async () => {
      const apple = load();
      try {
        const credential = await apple.signInAsync({
          requestedScopes: [
            apple.AppleAuthenticationScope.FULL_NAME,
            apple.AppleAuthenticationScope.EMAIL,
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
 * Sign in with Google through `@react-native-google-signin/google-signin`. The web client id comes
 * from configuration, so a build without one hides the button instead of failing at the sheet.
 */
export function googleIdentity(config: { webClientId?: string; iosClientId?: string }): NativeIdentityProvider {
  if (!config.webClientId) return unavailable;
  const load = () =>
    require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  let configured = false;
  const configure = () => {
    const google = load();
    if (!configured) {
      google.GoogleSignin.configure({ webClientId: config.webClientId, iosClientId: config.iosClientId });
      configured = true;
    }
    return google;
  };
  return {
    isAvailable: async () => true,
    requestToken: async () => {
      const google = configure();
      try {
        const response = await google.GoogleSignin.signIn();
        if (!google.isSuccessResponse(response)) return 'cancelled';
        const { idToken, user } = response.data;
        if (!idToken) throw new Error('Google returned no identity token');
        return { token: idToken, email: user.email ?? null };
      } catch (cause) {
        const code = (cause as { code?: string }).code;
        if (code === google.statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
        throw cause;
      }
    },
  };
}
