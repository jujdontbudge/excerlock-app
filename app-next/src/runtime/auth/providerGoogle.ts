import { AuthCancelledError, AuthError } from '../../ports/AuthPort';


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

export function buildRealGoogleRequest(clientId: string, redirectUri: string): GoogleAuthDeps {
  return {
    clientId,
    redirectUri,
    buildRequest: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { AuthRequest } = require('expo-auth-session') as typeof import('expo-auth-session');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
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
        get codeVerifier() {
          return (req as unknown as { codeVerifier?: string }).codeVerifier;
        },
      };
    },
    exchangeCode: async ({ code, codeVerifier, redirectUri: redirect }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
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
