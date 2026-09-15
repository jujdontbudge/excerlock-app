import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACTIVE_HANDSHAKE_KEY, clearActiveHandshake, loadActiveHandshake, saveActiveHandshake } from '../linkedHandshakeStore.research';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_SESSION = '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const NONCE = 'ab'.repeat(32);
const HANDSHAKE = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('round-trips the active handshake for exactly its session', async () => {
  await saveActiveHandshake(HANDSHAKE);

  expect(await loadActiveHandshake(SESSION.toUpperCase())).toEqual(HANDSHAKE);
  expect(await loadActiveHandshake(OTHER_SESSION)).toBeNull();
});

test('drops a stored handshake that belongs to a different or malformed session', async () => {
  await AsyncStorage.setItem(ACTIVE_HANDSHAKE_KEY, JSON.stringify({ ...HANDSHAKE, sessionId: OTHER_SESSION }));
  expect(await loadActiveHandshake(SESSION)).toBeNull();
  expect(await AsyncStorage.getItem(ACTIVE_HANDSHAKE_KEY)).toBeNull();

  // Missing nonce and wrong protocol never parse; the recorder-side link
  // parser is the single owner of that shape.
  await AsyncStorage.setItem(ACTIVE_HANDSHAKE_KEY, JSON.stringify({ sessionId: SESSION, protocolVersion: '1' }));
  expect(await loadActiveHandshake(SESSION)).toBeNull();
  await AsyncStorage.setItem(ACTIVE_HANDSHAKE_KEY, JSON.stringify({ ...HANDSHAKE, protocolVersion: '2' }));
  expect(await loadActiveHandshake(SESSION)).toBeNull();

  await AsyncStorage.setItem(ACTIVE_HANDSHAKE_KEY, 'not json');
  expect(await loadActiveHandshake(SESSION)).toBeNull();
});

test('clearing removes the stored handshake and is safe to repeat', async () => {
  await saveActiveHandshake(HANDSHAKE);
  await clearActiveHandshake();
  await clearActiveHandshake();
  expect(await AsyncStorage.getItem(ACTIVE_HANDSHAKE_KEY)).toBeNull();
  expect(await loadActiveHandshake(SESSION)).toBeNull();
});
