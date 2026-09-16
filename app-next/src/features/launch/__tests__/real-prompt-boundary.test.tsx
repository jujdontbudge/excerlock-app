import { render, screen } from '@testing-library/react-native';
const mockFakePromptHost = jest.fn(() => null);
const mockRouter = { push: jest.fn() };

jest.mock('expo-router', () => {
  const Stack = function MockStack({ children }: { children?: React.ReactNode }) { return <>{children}</>; };
  Stack.Screen = function MockScreen() { return null; };
  Stack.Protected = function MockProtected({ children }: { children?: React.ReactNode }) { return <>{children}</>; };
  return { Stack, useRouter: () => mockRouter, usePathname: () => '/home' };
});
jest.mock('../../../motion/useMotion', () => ({ useMotion: () => ({ reduced: true }) }));
jest.mock('../../../runtime/AppRuntimeProvider', () => ({ useRuntime: () => ({ kind: 'real', analytics: { screen: jest.fn() } }) }));
jest.mock('../../../state/selectors', () => ({ useRuntimeStatus: () => ({ loading: false }) }));
jest.mock('../../../state/entitlementStore', () => ({ entitlementStore: (selector: (state: unknown) => unknown) => selector({ data: { entitlement: { status: 'active' } } }) }));
jest.mock('../../../state/onboardingStore', () => ({ onboardingStore: (selector: (state: unknown) => unknown) => selector({ data: { complete: true, setupComplete: true, step: 'P' } }) }));
jest.mock('../../permissions/FakePromptHost', () => ({ FakePromptHost: () => mockFakePromptHost() }));

import { RootNavigator } from '../RootNavigator';

test('development preview with a real runtime never mounts the fake permission prompt host', async () => {
  await render(<RootNavigator />);
  expect(screen.queryByText('Fake prompt host')).toBeNull();
  expect(mockFakePromptHost).not.toHaveBeenCalled();
});
