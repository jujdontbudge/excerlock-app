import { getRandomBytes, randomUUID } from 'expo-crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
const links = require('../../../../plugins/linkedRecorderLinks') as typeof import('../../../../plugins/linkedRecorderLinks');

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

export function parseHandshake(params: LinkedTraceParams): LinkedHandshake | null {
  const sessionId = first(params.sessionId).toLowerCase();
  const nonce = first(params.nonce).toLowerCase();
  const protocolVersion = first(params.protocolVersion);
  if (!sessionId || !nonce || protocolVersion !== LINK_PROTOCOL_VERSION) return null;
  return { sessionId, nonce, protocolVersion };
}

export function newLinkedSession(): LinkedHandshake {
  const bytes = getRandomBytes(32);
  const nonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { sessionId: randomUUID().toLowerCase(), nonce, protocolVersion: LINK_PROTOCOL_VERSION };
}

function labURL(host: string, query: readonly (readonly [string, string])[]): string {
  const search = query.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `${links.WALKING_RECORDER_SCHEME}://${host}?${search}`;
}

export function walkingRecorderSessionLink(handshake: LinkedHandshake): string {
  return labURL(links.WALKING_RECORDER_LINK_HOSTS.linkedSession, [
    ['sessionId', handshake.sessionId],
    ['nonce', handshake.nonce],
    ['protocolVersion', handshake.protocolVersion],
  ]);
}

export function walkingRecorderArchiveLink(sessionId: string): string {
  return labURL(links.WALKING_RECORDER_LINK_HOSTS.shareArchive, [['sessionId', sessionId]]);
}

export function walkingRecorderAppLink(): string {
  return `${links.WALKING_RECORDER_SCHEME}://`;
}
