import * as AppleAuthentication from 'expo-apple-authentication';
import { appleIdentity, googleIdentity } from '../identityProviders';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn() },
  isSuccessResponse: jest.fn(),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

const google = jest.requireMock('@react-native-google-signin/google-signin');
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
    await expect(googleIdentity({ webClientId: 'web.apps.googleusercontent.com' }).requestToken()).resolves.toEqual({
      token: 'google-id-token',
      email: 'alex@example.test',
    });
    expect(google.GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web.apps.googleusercontent.com',
      iosClientId: undefined,
    });
  });

  test('reports a dismissed sheet as a cancellation, not a failure', async () => {
    google.GoogleSignin.signIn.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' }));
    await expect(googleIdentity({ webClientId: 'web.apps.googleusercontent.com' }).requestToken()).resolves.toBe(
      'cancelled',
    );
  });

  test('a build with no client id says so instead of pretending someone cancelled', async () => {
    const provider = googleIdentity({});
    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.requestToken()).rejects.toThrow(/not available in this build/);
  });
});
