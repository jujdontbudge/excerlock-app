import { getRandomBytes, randomUUID } from 'expo-crypto';

// Trace Lab starts one linked test and hands the co-installed Walking Recorder
// a single lab-only link. The recorder keeps the one-time nonce in its own
// protected recovery file and returns through the Trace Lab scheme, so the
// nonce never enters an export and never reaches production ExcerLock.
// Link identity lives in a module the research bundle may import; the build
// opt-in owner (`linkedRecorderResearchConfig.js`) re-exports these values and
// keeps the dev-client module names out of this bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const links = require('../../../plugins/linkedRecorderLinks') as typeof import('../../../plugins/linkedRecorderLinks');

export const LINK_PROTOCOL_VERSION = '1';

export type LinkedHandshake = {
  sessionId: string;
  nonce: string;
  protocolVersion: string;
};

export type LinkedTraceParams = {
  sessionId?: string | string[];
  nonce?: string | string[];
  protocolVersion?: string | string[];
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/**
 * Reads a Recorder return link. `LinkedTraceWriter` remains the only validator
 * of session-id and nonce shape; this refuses an absent or wrong-protocol link
 * so a stray URL can never look like a finished test.
 */
export function parseHandshake(params: LinkedTraceParams): LinkedHandshake | null {
  const sessionId = first(params.sessionId).toLowerCase();
  const nonce = first(params.nonce).toLowerCase();
  const protocolVersion = first(params.protocolVersion);
  if (!sessionId || !nonce || protocolVersion !== LINK_PROTOCOL_VERSION) return null;
  return { sessionId, nonce, protocolVersion };
}

/** 256-bit one-time nonce plus a v4 session UUID, generated on the phone. */
export function newLinkedSession(): LinkedHandshake {
  const bytes = getRandomBytes(32);
  const nonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { sessionId: randomUUID().toLowerCase(), nonce, protocolVersion: LINK_PROTOCOL_VERSION };
}

function labURL(host: string, query: readonly (readonly [string, string])[]): string {
  const search = query.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `${links.WALKING_RECORDER_SCHEME}://${host}?${search}`;
}

/** Opens Walking Recorder for exactly this test. */
export function walkingRecorderSessionLink(handshake: LinkedHandshake): string {
  return labURL(links.WALKING_RECORDER_LINK_HOSTS.linkedSession, [
    ['sessionId', handshake.sessionId],
    ['nonce', handshake.nonce],
    ['protocolVersion', handshake.protocolVersion],
  ]);
}

/** Opens Walking Recorder so it can share the archive for this test. */
export function walkingRecorderArchiveLink(sessionId: string): string {
  return labURL(links.WALKING_RECORDER_LINK_HOSTS.shareArchive, [['sessionId', sessionId]]);
}

/**
 * Opens Walking Recorder with no session, used when Trace Lab no longer holds
 * the link: the recorder's own recovery card returns it to this screen.
 */
export function walkingRecorderAppLink(): string {
  return `${links.WALKING_RECORDER_SCHEME}://`;
}
