import { apiBaseUrl, DEFAULT_API_BASE_URL } from '../config';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));
const constants = jest.requireMock('expo-constants').default as { expoConfig: { extra: unknown } | null };
const setExtra = (extra: unknown) => {
  constants.expoConfig = extra ? { extra } : null;
};

describe('apiBaseUrl', () => {
  const original = process.env.EXPO_PUBLIC_API_URL;
  afterEach(() => {
    setExtra(null);
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
  });

  it('prefers the value app.config.ts published', () => {
    setExtra({ clientAuth: { apiBaseUrl: 'https://staging.excerlock.test/' } });
    process.env.EXPO_PUBLIC_API_URL = 'https://ignored.test';
    expect(apiBaseUrl()).toBe('https://staging.excerlock.test');
  });

  it('falls back to the public env var for a local dev server', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000//';
    expect(apiBaseUrl()).toBe('http://localhost:3000');
  });

  it('is production when nothing is configured', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(apiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it('ignores a blank published value', () => {
    setExtra({ clientAuth: { apiBaseUrl: '   ' } });
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(apiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });
});
