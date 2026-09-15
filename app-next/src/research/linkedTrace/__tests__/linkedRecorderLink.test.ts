import {
  LINK_PROTOCOL_VERSION,
  newLinkedSession,
  parseHandshake,
  walkingRecorderAppLink,
  walkingRecorderArchiveLink,
  walkingRecorderSessionLink,
} from '../linkedRecorderLink';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '123E4567-E89B-42D3-A456-426614174000'),
  getRandomBytes: jest.fn((count: number) => new Uint8Array(count).fill(0xab)),
}));

test('mints one lowercase v4 session id and a 256-bit hex nonce', () => {
  const link = newLinkedSession();
  expect(link.sessionId).toBe('123e4567-e89b-42d3-a456-426614174000');
  expect(link.nonce).toHaveLength(64);
  expect(link.nonce).toMatch(/^[0-9a-f]{64}$/);
  expect(link.protocolVersion).toBe(LINK_PROTOCOL_VERSION);
});

test('reads only a complete return link', () => {
  const link = newLinkedSession();
  expect(parseHandshake({ sessionId: link.sessionId, nonce: link.nonce, protocolVersion: '1' })).toEqual(link);
  expect(parseHandshake({ sessionId: link.sessionId, nonce: link.nonce })).toBeNull();
  expect(parseHandshake({ sessionId: '', nonce: link.nonce, protocolVersion: '1' })).toBeNull();
  expect(parseHandshake({ sessionId: link.sessionId, nonce: '', protocolVersion: '1' })).toBeNull();
  expect(parseHandshake({ sessionId: link.sessionId, nonce: link.nonce, protocolVersion: '2' })).toBeNull();
  expect(parseHandshake({ sessionId: [link.sessionId], nonce: [link.nonce], protocolVersion: ['1'] })).toEqual(link);
});

test('uses only the lab-only Walking Recorder links', () => {
  const link = newLinkedSession();
  const session = new URL(walkingRecorderSessionLink(link));
  expect(session.protocol).toBe('excerlock-walkingrecorder:');
  expect(session.host).toBe('linked-session');
  expect(session.searchParams.get('sessionId')).toBe(link.sessionId);
  expect(session.searchParams.get('nonce')).toBe(link.nonce);
  expect(session.searchParams.get('protocolVersion')).toBe('1');

  const archive = new URL(walkingRecorderArchiveLink(link.sessionId));
  expect(archive.protocol).toBe('excerlock-walkingrecorder:');
  expect(archive.host).toBe('share-archive');
  expect(archive.searchParams.get('sessionId')).toBe(link.sessionId);

  expect(walkingRecorderAppLink()).toBe('excerlock-walkingrecorder://');
});
