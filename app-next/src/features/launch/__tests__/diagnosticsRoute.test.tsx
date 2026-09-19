/**
 * The `/diagnostics/sensors` route is the e2e harness's window onto the native
 * sensor surface. It must be routable in a preview Release build and never in a
 * prod (TestFlight / App Store) build, whatever the entitlement or onboarding state.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { RootNavigator } from '../RootNavigator';

type ScreenRecord = { excluded: boolean; name: string };
const mockScreens: ScreenRecord[] = [];
const mockExtra: { environment?: string } = {};

function mockWalk(children: React.ReactNode, excluded: boolean) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { name?: string; guard?: boolean; children?: React.ReactNode };
    if (typeof props.name === 'string') {
      mockScreens.push({ excluded, name: props.name });
      return;
    }
    if (typeof props.guard === 'boolean') mockWalk(props.children, excluded || !props.guard);
  });
}

jest.mock('expo-router', () => {
  const Stack = Object.assign(
    function MockStack({ children }: { children?: React.ReactNode }) {
      mockWalk(children, false);
      return null;
    },
    { Screen: function MockScreen() { return null; }, Protected: function MockProtected() { return null; } },
  );
  return { Stack, useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { get expoConfig() { return { extra: mockExtra }; } } }));
jest.mock('../../../motion/useMotion', () => ({ useMotion: () => ({ reduced: true }) }));
jest.mock('../../../runtime/AppRuntimeProvider', () => ({ useRuntime: () => ({ kind: 'real', analytics: { screen: jest.fn() } }) }));
jest.mock('../../../state/selectors', () => ({ useRuntimeStatus: () => ({ loading: false, hydrated: true }) }));
jest.mock('../../../state/entitlementStore', () => ({
  entitlementStore: (selector: (state: unknown) => unknown) => selector({ data: { entitlement: { status: 'active' }, hydrated: true } }),
}));
jest.mock('../../../state/onboardingStore', () => ({
  onboardingStore: (selector: (state: unknown) => unknown) => selector({ data: { complete: true, step: 'P', setupComplete: true } }),
}));
jest.mock('../../permissions/FakePromptHost', () => ({ FakePromptHost: () => null }));

beforeEach(() => { mockScreens.length = 0; });

async function routes(environment: string) {
  mockExtra.environment = environment;
  await render(<RootNavigator />);
  return {
    available: mockScreens.filter((screen) => !screen.excluded).map((screen) => screen.name),
    excluded: mockScreens.filter((screen) => screen.excluded).map((screen) => screen.name),
  };
}

test('a preview build routes the sensor smoke screen', async () => {
  const { available } = await routes('preview');
  expect(available).toContain('diagnostics/sensors');
  expect(available).toContain('(tabs)');
});

test('a prod build registers the route behind a closed guard, so the shipped binary never shows it', async () => {
  const { available, excluded } = await routes('prod');
  expect(excluded).toContain('diagnostics/sensors');
  expect(available).not.toContain('diagnostics/sensors');
  expect(available).toContain('(tabs)');
});
