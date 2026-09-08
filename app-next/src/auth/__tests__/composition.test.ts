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

test('a build with no Supabase keys composes nothing and the app stays local-only', () => {
  mockConfigured = false;
  expect(supabaseAuth()).toBeNull();
});

test('the runtime can hand over its own VPS client instead of the fallback in this module', async () => {
  // P2-T10's `createVpsProvisioning(client)` is structurally this interface, so the app ships one
  // HTTP client rather than the fetch implementation here plus the runtime's.
  const account: jest.Mocked<AccountProvisioning> = {
    provision: jest.fn(async (accessToken: string) => (accessToken ? 'ok' : 'failed')),
    remove: jest.fn(async (accessToken: string) => (accessToken ? 'ok' : 'deleted')),
  };
  const auth = supabaseAuth({ account })!;
  await auth.start();
  expect(account.provision).toHaveBeenCalledWith(mockClient.accessToken());

  const token = mockClient.accessToken();
  await auth.port.deleteAccount();
  expect(account.remove).toHaveBeenCalledWith(token);
  auth.dispose();
});
