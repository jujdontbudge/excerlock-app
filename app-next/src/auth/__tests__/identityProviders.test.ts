import * as AppleAuthentication from 'expo-apple-authentication';
import { appleIdentity, googleIdentity } from '../identityProviders';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn() },
  isSuccessResponse: jest.fn(),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

const google = jest.requireMock('@react-native-google-signin/google-signin');
const clients = { webClientId: 'web.apps.googleusercontent.com', iosClientId: 'ios.apps.googleusercontent.com' };
const signInAsync = AppleAuthentication.signInAsync as jest.Mock;

describe('Sign in with Apple', () => {
  test('hands back the identity token the sheet returned', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'apple-id-token', email: 'alex@example.test' });
    await expect(appleIdentity().requestToken()).resolves.toEqual({
      token: 'apple-id-token',
      email: 'alex@example.test',
    });
  });

  test('reports a dismissed sheet as a cancellation, not a failure', async () => {
    signInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    await expect(appleIdentity().requestToken()).resolves.toBe('cancelled');
  });

  test('a sheet that returns no token is a failure', async () => {
    signInAsync.mockResolvedValue({ identityToken: null, email: null });
    await expect(appleIdentity().requestToken()).rejects.toThrow(/identity token/i);
  });
});

describe('Sign in with Google', () => {
  test('hands back the identity token the sheet returned', async () => {
    google.GoogleSignin.signIn.mockResolvedValue({
      data: { idToken: 'google-id-token', user: { email: 'alex@example.test' } },
    });
    google.isSuccessResponse.mockReturnValue(true);
    await expect(googleIdentity(clients).requestToken()).resolves.toEqual({
      token: 'google-id-token',
      email: 'alex@example.test',
    });
    expect(google.GoogleSignin.configure).toHaveBeenCalledWith(clients);
  });

  test('reports a dismissed sheet as a cancellation, not a failure', async () => {
    google.GoogleSignin.signIn.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' }));
    await expect(googleIdentity(clients).requestToken()).resolves.toBe('cancelled');
  });

  test.each([{}, { webClientId: clients.webClientId }, { iosClientId: clients.iosClientId }])(
    'a build missing a client id says so instead of pretending someone cancelled (%o)',
    async (partial) => {
      const provider = googleIdentity(partial);
      await expect(provider.isAvailable()).resolves.toBe(false);
      await expect(provider.requestToken()).rejects.toThrow(/not available in this build/);
    },
  );
});
