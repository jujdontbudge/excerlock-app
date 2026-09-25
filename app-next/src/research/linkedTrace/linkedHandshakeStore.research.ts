import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseHandshake, type LinkedHandshake } from './linkedRecorderLink';

export const ACTIVE_HANDSHAKE_KEY = 'excerlock-lab-linked-recorder-handshake-v1';

export async function saveActiveHandshake(handshake: LinkedHandshake): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_HANDSHAKE_KEY, JSON.stringify(handshake));
}

export async function loadActiveHandshake(sessionId: string): Promise<LinkedHandshake | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_HANDSHAKE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Record<string, unknown>;
    const handshake = parseHandshake({
      sessionId: typeof candidate.sessionId === 'string' ? candidate.sessionId : undefined,
      nonce: typeof candidate.nonce === 'string' ? candidate.nonce : undefined,
      protocolVersion: typeof candidate.protocolVersion === 'string' ? candidate.protocolVersion : undefined,
    });
    if (!handshake || handshake.sessionId !== sessionId.toLowerCase()) {
      await clearActiveHandshake();
      return null;
    }
    return handshake;
  } catch {
    return null;
  }
}

export async function clearActiveHandshake(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_HANDSHAKE_KEY);
  } catch {
  }
}
