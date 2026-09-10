import { AuthCancelledError, AuthError } from '../../ports/AuthPort';

/**
 * Google native sign-in via Expo AuthSession code + PKCE + state (SDK57).
 *
 * Supported flow (installed expo-auth-session@57.0.5):
 * - AuthRequest with ResponseType.Code, usePKCE true, codeChallengeMethod S256,
 *   auto-generated state (CSRF), scopes openid/profile/email, clientId = the
 *   iOS client ID from clientAuth (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID). Never a
 *   web client secret on the client.
 * - promptAsync(discovery) opens the system browser; result.type success with
 *   params.code, otherwise cancel/dismiss -> AuthCancelledError, error/locked
 *   -> AuthError visible retry. State mismatch is an error, never silent.
 * - exchangeCodeAsync (AccessTokenRequest) trades code + codeVerifier +
 *   redirectUri for tokens; id_token is the Supabase linkIdentity token. The
 *   exchange never sends a client secret.
 *
 * This module is injectable for deterministic tests; the real implementation
 * lives in realGoogleSignIn below and is provided by the root.
 */

export type GoogleCredential = {
  idToken: string;
  accessToken?: string;
};

export type GoogleAuthDeps = {
  clientId: string;
  redirectUri: string;
  buildRequest: () => {
    promptAsync: (discovery: unknown) => Promise<{ type: string; params?: Record<string, string>; error?: { message?: string } }>;
    codeVerifier?: string;
  };
  exchangeCode: (args: { code: string; codeVerifier: string; redirectUri: string }) => Promise<{ idToken?: string; accessToken?: string }>;
  discovery?: unknown;
};

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
};

export function validateGoogleConfig(clientId: string, redirectUri: string): void {
  if (!clientId || !clientId.trim()) {
    throw new AuthError('Google sign-in is not configured. Please try again.', { code: 'GOOGLE_CONFIG_MISSING' });
  }
  if (!redirectUri || !redirectUri.trim()) {
    throw new AuthError('Google sign-in is not configured. Please try again.', { code: 'GOOGLE_CONFIG_MISSING' });
  }
  if (/secret/i.test(clientId)) {
    throw new AuthError('Invalid Google configuration.', { code: 'GOOGLE_CONFIG_INVALID' });
  }
}

export async function requestGoogleCredential(deps: GoogleAuthDeps): Promise<GoogleCredential> {
  validateGoogleConfig(deps.clientId, deps.redirectUri);
  const request = deps.buildRequest();
  let result: { type: string; params?: Record<string, string>; error?: { message?: string } };
  try {
    result = await request.promptAsync(deps.discovery ?? GOOGLE_DISCOVERY);
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (code === 'ERR_REQUEST_CANCELED') throw new AuthCancelledError();
    throw new AuthError('Google sign-in failed. Please try again.', { code: 'GOOGLE_SIGNIN_FAILED' });
  }
  if (result.type === 'cancel' || result.type === 'dismiss') throw new AuthCancelledError();
  if (result.type !== 'success') {
    const message = result.error?.message ?? 'Google sign-in failed. Please try again.';
    throw new AuthError(message, { code: 'GOOGLE_SIGNIN_FAILED' });
  }
  const code = result.params?.code;
  if (!code) {
    throw new AuthError('Google did not return a code. Please try again.', { code: 'GOOGLE_CODE_MISSING' });
  }
  const codeVerifier = request.codeVerifier;
  if (!codeVerifier) {
    throw new AuthError('Google sign-in failed. Please try again.', { code: 'GOOGLE_PKCE_MISSING' });
  }
  let tokens: { idToken?: string; accessToken?: string };
  try {
    tokens = await deps.exchangeCode({ code, codeVerifier, redirectUri: deps.redirectUri });
  } catch {
    throw new AuthError('Google sign-in failed. Please try again.', { code: 'GOOGLE_EXCHANGE_FAILED' });
  }
  if (!tokens.idToken) {
    throw new AuthError('Google did not return a token. Please try again.', { code: 'GOOGLE_TOKEN_MISSING' });
  }
  return { idToken: tokens.idToken, accessToken: tokens.accessToken };
}

/** Real factory for the root (not used in Jest without native modules). */
export function buildRealGoogleRequest(clientId: string, redirectUri: string): GoogleAuthDeps {
  return {
    clientId,
    redirectUri,
    buildRequest: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AuthRequest } = require('expo-auth-session') as typeof import('expo-auth-session');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ResponseType, CodeChallengeMethod } = require('expo-auth-session') as typeof import('expo-auth-session');
      const req = new AuthRequest({
        clientId,
        redirectUri,
        responseType: ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
        codeChallengeMethod: CodeChallengeMethod.S256,
      });
      return {
        promptAsync: (discovery) => req.promptAsync(discovery as never) as unknown as Promise<{ type: string; params?: Record<string, string> }>,
        codeVerifier: (req as unknown as { codeVerifier?: string }).codeVerifier,
      };
    },
    exchangeCode: async ({ code, codeVerifier, redirectUri: redirect }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { exchangeCodeAsync } = require('expo-auth-session') as typeof import('expo-auth-session');
      const res = await exchangeCodeAsync(
        { clientId, redirectUri: redirect, code, extraParams: { code_verifier: codeVerifier } },
        GOOGLE_DISCOVERY,
      );
      return { idToken: (res as { idToken?: string }).idToken, accessToken: (res as { accessToken?: string }).accessToken };
    },
    discovery: GOOGLE_DISCOVERY,
  };
}
