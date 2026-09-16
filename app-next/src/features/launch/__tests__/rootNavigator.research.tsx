/**
 * Lab-mode route-access contract for the standalone Trace Lab build.
 *
 * This file is deliberately outside the default Jest `testMatch`: it must run
 * with `EXCERLOCK_LINKED_RECORDER_TRACE=1` so Babel inlines the same research
 * flag the standalone artifact compiles. `guardrails/linked-recorder-boundary.test.ts`
 * executes it through a research-mode `--testMatch` with that environment, and
 * the first test asserts the flag really was compiled in, so an ordinary
 * cached or unflagged run fails loudly instead of passing without exercising
 * the lab.
 *
 * The mocked `Stack` reproduces expo-router's own screen collection
 * (`useFilterScreenChildren` in expo-router: a screen name is excluded from the
 * navigator when it sits inside any `Stack.Protected` whose guard is false), so
 * the assertions describe the real navigator the lab build registers.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { RootNavigator } from '../RootNavigator';
import { BootGate } from '../BootGate';

type ScreenRecord = { excluded: boolean; name: string };

const mockScreens: ScreenRecord[] = [];
const mockRedirects: string[] = [];
const mockProductionScreens = [
  'gym-picker',
  'onboarding/[step]',
  'paywall',
  'setup/[step]',
  '(tabs)',
  'settings',
  'sign-in',
  'builder',
  'unlock/gym',
  'unlock/treadmill',
];

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
    {
      Screen: function MockScreen() {
        return null;
      },
      Protected: function MockProtected() {
        return null;
      },
    },
  );
  const Redirect = function MockRedirect({ href }: { href: string }) {
    mockRedirects.push(href);
    return null;
  };
  return { Stack, Redirect, useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' };
});
jest.mock('../../../motion/useMotion', () => ({ useMotion: () => ({ reduced: true }) }));
jest.mock('../../../runtime/AppRuntimeProvider', () => ({ useRuntime: () => ({ kind: 'real', analytics: { screen: jest.fn() } }) }));
jest.mock('../../../state/selectors', () => ({ useRuntimeStatus: () => ({ loading: false, hydrated: true }) }));
jest.mock('../../../state/useHydrated', () => ({ useHydrated: () => true }));
jest.mock('../../../state/entitlementStore', () => ({
  entitlementStore: (selector: (state: unknown) => unknown) =>
    selector({ data: { entitlement: { status: 'active' }, hydrated: true } }),
}));
jest.mock('../../../state/onboardingStore', () => ({
  onboardingStore: (selector: (state: unknown) => unknown) =>
    selector({ data: { complete: false, step: 'O01', setupComplete: false, setupStep: 'S1' } }),
}));
jest.mock('../../permissions/FakePromptHost', () => ({ FakePromptHost: () => null }));
jest.mock('@linked-trace', () => ({ linkedTrace: { enabled: true, record: jest.fn() } }));

beforeEach(() => {
  mockScreens.length = 0;
  mockRedirects.length = 0;
});

test('the research flag is compiled in for this lab-mode run', () => {
  expect(__LINKED_RECORDER_TRACE__).toBe(true);
});

test('the lab navigator registers no production route at all', async () => {
  await render(<RootNavigator />);
  const available = mockScreens.filter((screen) => !screen.excluded).map((screen) => screen.name);
  const excluded = mockScreens.filter((screen) => screen.excluded).map((screen) => screen.name);
  // The lab-local entitlement is active and production onboarding is
  // incomplete; no research or entitlement input may unlock a production route.
  expect(available).toContain('linked-trace');
  for (const name of mockProductionScreens) {
    expect(excluded).toContain(name);
    expect(available).not.toContain(name);
  }
});

test('the lab build boots straight into its linked-trace screen', async () => {
  await render(<BootGate />);
  expect(mockRedirects).toEqual(['/linked-trace']);
});
