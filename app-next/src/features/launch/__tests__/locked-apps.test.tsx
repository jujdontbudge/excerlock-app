import { Text } from 'react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { RootNavigator } from '../RootNavigator';
import { lockedAppsDestination } from '../lockedAppsDestination';
import LockedApps from '../../../../app/locked-apps';

async function landOnLockedApps(scenario: string) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  const rendered = await renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <RootNavigator />
        </AppRuntimeProvider>
      ),
      index: () => <Text>Boot</Text>,
      'locked-apps': LockedApps,
      '(tabs)/_layout': () => <Slot />,
      '(tabs)/home': () => <Text>Home</Text>,
      paywall: () => <Text>Paywall</Text>,
      'onboarding/[step]': () => <Text>Onboarding</Text>,
      'setup/[step]': () => <Text>Setup</Text>,
      dev: () => <Text>Dev</Text>,
    },
    { initialUrl: '/locked-apps' },
  );
  return { runtime, rendered };
}

test("the notification's locked apps landing sends an entitled user to Home", async () => {
  const { runtime, rendered } = await landOnLockedApps('home-locked-walking');

  expect(await screen.findByText('Home')).toBeTruthy();
  await rendered.unmount();
  runtime.dispose();
});

test('the locked apps landing sends a lapsed user to the paywall instead', async () => {
  const { runtime, rendered } = await landOnLockedApps('trial-expired');

  expect(await screen.findByText('Paywall')).toBeTruthy();
  await rendered.unmount();
  runtime.dispose();
});

test('the redirect rule reads only the entitlement status', () => {
  expect(lockedAppsDestination('trial')).toBe('/(tabs)/home');
  expect(lockedAppsDestination('active')).toBe('/(tabs)/home');
  for (const status of ['none', 'expired', 'billingIssue'] as const)
    expect(lockedAppsDestination(status)).toBe('/paywall');
  expect(lockedAppsDestination('unknown')).toBeNull();
});

test('the locked apps route is registered outside every guard', () => {
  const navigator = readFileSync(join(__dirname, '..', 'RootNavigator.tsx'), 'utf8');
  const registration = navigator.indexOf('name="locked-apps"');
  expect(registration).toBeGreaterThan(-1);
  expect(registration).toBeLessThan(navigator.indexOf('Stack.Protected'));
});
