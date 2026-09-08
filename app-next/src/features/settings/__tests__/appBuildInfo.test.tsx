import { render, screen } from '@testing-library/react-native';
import { appBuildInfo } from '../appBuildInfo';
import { AboutSection } from '../sections/AboutSection';

// Getters, because `import * as` snapshots plain properties when the module is first required.
const mockApplication = { nativeApplicationVersion: null as string | null, nativeBuildVersion: null as string | null };
jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
  get nativeBuildVersion() {
    return mockApplication.nativeBuildVersion;
  },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0', ios: { buildNumber: '7' } } },
}));
const constants = jest.requireMock('expo-constants').default as {
  expoConfig: { version?: string; ios?: { buildNumber?: string } } | null;
};

afterEach(() => {
  mockApplication.nativeApplicationVersion = null;
  mockApplication.nativeBuildVersion = null;
  constants.expoConfig = { version: '1.0.0', ios: { buildNumber: '7' } };
});

test('the native bundle version and build win over app.json, which remote versioning leaves without a build number', async () => {
  mockApplication.nativeApplicationVersion = '1.2.0';
  mockApplication.nativeBuildVersion = '45';
  constants.expoConfig = { version: '1.2.0' };
  expect(appBuildInfo()).toEqual({ version: '1.2.0', build: '45' });
  await render(<AboutSection onDev={() => {}} />);
  expect(screen.getByRole('button', { name: 'ExcerLock 1.2.0 (45)' })).toBeTruthy();
});

test('a development run falls back to app.json, and a caller default covers a missing config', () => {
  expect(appBuildInfo()).toEqual({ version: '1.0.0', build: '7' });
  constants.expoConfig = null;
  expect(appBuildInfo()).toEqual({ version: '1.0.0', build: '1' });
  expect(appBuildInfo({ version: 'Not recorded', build: 'Not recorded' })).toEqual({
    version: 'Not recorded',
    build: 'Not recorded',
  });
});
