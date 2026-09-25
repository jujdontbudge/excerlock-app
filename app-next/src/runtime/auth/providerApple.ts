import { AuthCancelledError, AuthError } from '../../ports/AuthPort';


export type AppleCredential = {
  identityToken: string;
  rawNonce: string;
  authorizationCode?: string | null;
  user?: string | null;
};

export type AppleNativeDeps = {
  signInAsync: (options: { nonce: string; requestedScopes?: unknown[] }) => Promise<{
    identityToken: string | null;
    authorizationCode: string | null;
    user: string | null;
  }>;
  digestSHA256Hex: (value: string) => Promise<string>;
  randomNonce?: () => string;
};

export function generateRawNonce(randomBytes?: () => string): string {
  if (randomBytes) return randomBytes();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export async function hashNonceSHA256Hex(rawNonce: string, digestSHA256Hex: (value: string) => Promise<string>): Promise<string> {
  const hashed = await digestSHA256Hex(rawNonce);
  if (!hashed) throw new AuthError('Could not prepare Apple sign-in. Please try again.', { code: 'APPLE_NONCE_FAILED' });
  return hashed;
}

export async function realDigestSHA256Hex(value: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const Crypto = require('expo-crypto') as typeof import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

export async function requestAppleCredential(deps: AppleNativeDeps, rawNonce?: string): Promise<AppleCredential> {
  const raw = rawNonce ?? generateRawNonce(deps.randomNonce);
  const hashed = await hashNonceSHA256Hex(raw, deps.digestSHA256Hex);
  let credential: { identityToken: string | null; authorizationCode: string | null; user: string | null };
  try {
    credential = await deps.signInAsync({ nonce: hashed });
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (code === 'ERR_REQUEST_CANCELED') throw new AuthCancelledError();
    throw new AuthError('Apple sign-in failed. Please try again.', { code: 'APPLE_SIGNIN_FAILED' });
  }
  if (!credential.identityToken) {
    throw new AuthError('Apple did not return a token. Please try again.', { code: 'APPLE_TOKEN_MISSING' });
  }
  return { identityToken: credential.identityToken, rawNonce: raw, authorizationCode: credential.authorizationCode, user: credential.user };
}

export async function realAppleSignIn(hashedNonce: string): Promise<{ identityToken: string | null; authorizationCode: string | null; user: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
  const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  return Apple.signInAsync({ nonce: hashedNonce });
}
