import { RuntimeCleanupError } from '../RuntimeSingleton';
import { createClientServices } from '../createClientServices';
import { createIdentityServices } from '../createIdentityServices';
import { createNativeJsonExport } from '../NativeJsonExport';

jest.mock('../createIdentityServices', () => ({ createIdentityServices: jest.fn() }));
jest.mock('../NativeJsonExport', () => ({ createNativeJsonExport: jest.fn() }));
jest.mock('../observability/SentryBinding', () => ({ initializeSentrySdk: jest.fn() }));
jest.mock('../clientConfiguration', () => ({ readClientConfiguration: () => ({
  sentryDsn: '', environment: 'test', adaptyPublicKey: 'adapty',
  auth: { supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'public', apiBaseUrl: 'https://api.invalid', googleIosClientId: 'google', googleRedirectUri: 'excerlock://auth' },
  posthog: {},
}) }));

const identity = (dispose: jest.Mock) => ({
  auth: { identity: () => ({ kind: 'provisional', generation: 0, userId: null }) },
  subscription: {}, analytics: {}, boot: jest.fn(), waitForIdentityReady: jest.fn(), runIdentityOperation: jest.fn(), dispose,
});

test('native factory failure awaits identity rollback', async () => {
  const dispose = jest.fn(async () => undefined);
  jest.mocked(createIdentityServices).mockResolvedValue(identity(dispose) as never);
  jest.mocked(createNativeJsonExport).mockImplementationOnce(() => { throw new Error('native export construction'); });
  await expect(createClientServices({ extra: {}, version: '1', build: '1', beforeDelete: async () => {}, afterDelete: async () => {}, reportError: jest.fn() }))
    .rejects.toThrow('native export construction');
  expect(dispose).toHaveBeenCalledTimes(1);
});

test('failed post-identity rollback is retry unsafe', async () => {
  const cleanupFailure = new Error('identity cleanup');
  jest.mocked(createIdentityServices).mockResolvedValue(identity(jest.fn(async () => { throw cleanupFailure; })) as never);
  jest.mocked(createNativeJsonExport).mockImplementationOnce(() => { throw new Error('native export construction'); });
  await expect(createClientServices({ extra: {}, version: '1', build: '1', beforeDelete: async () => {}, afterDelete: async () => {}, reportError: jest.fn() }))
    .rejects.toEqual(new RuntimeCleanupError([new Error('native export construction'), cleanupFailure]));
});
