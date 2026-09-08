import type { AccountProvisioning } from '../accountProvisioning';
import { supabaseAuth } from '../index';
import { supabaseDouble } from './supabaseDouble';

const mockClient = supabaseDouble();
let mockConfigured = true;

// The Google SDK reaches for a native module that no test host has.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn() },
  isSuccessResponse: jest.fn(),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

jest.mock('../supabaseClient', () => ({
  authConfig: () =>
    mockConfigured ? { url: 'https://project.test', key: 'anon', apiBaseUrl: 'https://api.test' } : null,
  createSupabaseAuthApi: () => mockClient,
}));

beforeEach(() => {
  mockConfigured = true;
});

const accountDouble = (): jest.Mocked<AccountProvisioning> => ({
  provision: jest.fn(async (accessToken: string) => (accessToken ? 'ok' : 'failed')),
  remove: jest.fn(async (accessToken: string) => (accessToken ? 'ok' : 'deleted')),
});

test('a build with no Supabase keys composes nothing and the app stays local-only', () => {
  mockConfigured = false;
  expect(supabaseAuth({ account: accountDouble() })).toBeNull();
});

test('the VPS half of the spine comes from the composition, never from a client of its own', async () => {
  // `adapters/api`'s `createVpsProvisioning(client)` is this interface, and it is the only
  // implementation: the app ships one HTTP client for one server.
  const account = accountDouble();
  const auth = supabaseAuth({ account })!;
  await auth.start();
  expect(account.provision).toHaveBeenCalledWith(mockClient.accessToken());

  const token = mockClient.accessToken();
  await auth.port.deleteAccount();
  expect(account.remove).toHaveBeenCalledWith(token);
  auth.dispose();
});
