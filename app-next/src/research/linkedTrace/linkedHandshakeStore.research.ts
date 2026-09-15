import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseHandshake, type LinkedHandshake } from './linkedRecorderLink';

/**
 * The lab's own record of the one active test handshake.
 *
 * Trace Lab keeps this in its own sandbox so a relaunch can reopen the intended
 * Walking Recorder session link: the nonce never exists anywhere else in Trace
 * Lab once its in-memory state is gone. It is written when a test starts and
 * cleared when the test is saved, cancelled, expired, or found inactive, and it
 * is never exported or uploaded. Walking Recorder's protected recovery file
 * remains the recorder-side copy.
 */
export const ACTIVE_HANDSHAKE_KEY = 'excerlock-lab-linked-recorder-handshake-v1';

export async function saveActiveHandshake(handshake: LinkedHandshake): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_HANDSHAKE_KEY, JSON.stringify(handshake));
}

/** The stored handshake for exactly this active session, or null. */
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
      // A stored handshake for a different (or malformed) session is stale, so
      // it is dropped rather than left to be mistaken for the current test.
      await clearActiveHandshake();
      return null;
    }
    return handshake;
  } catch {
    return null;
  }
}

/** Best-effort cleanup; a missing key is already the desired state. */
export async function clearActiveHandshake(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_HANDSHAKE_KEY);
  } catch {
    // Nothing else depends on this succeeding; the next save overwrites it.
  }
}
