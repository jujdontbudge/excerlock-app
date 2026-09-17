import { render } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../AppRuntimeProvider';
import { createRuntime } from '../../createRuntime';
import { OnboardingRoute } from '../../../features/onboarding/OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
import { useScreenTracking } from '../useScreenTracking';
import { createAnalyticsFixture, flushAdapter } from './analyticsFixture';
import type { Runtime } from '../../Runtime';

// The root subscriber owns `usePathname`; the onboarding route owns the params.
jest.mock('expo-router', () => ({
  usePathname: () => '/onboarding/O01',
  useLocalSearchParams: () => ({ step: 'O01' }),
  useRouter: () => ({ setParams: jest.fn(), replace: jest.fn() }),
  useIsFocused: () => true,
}));

function RootScreenSubscriber() {
  useScreenTracking();
  return null;
}

test('the first screen of a cold start reaches the transport once the identity spine commits', async () => {
  onboardingStore.getState().reset();
  const runtime: Runtime = createRuntime('fake');
  const x = createAnalyticsFixture();
  // Fresh install: no canonical user and nothing committed by the spine yet.
  x.setIdentity({ userId: null, generation: 0, ready: false });
  runtime.analytics = x.adapter;
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <RootScreenSubscriber />
      <OnboardingRoute />
    </AppRuntimeProvider>,
  );
  await flushAdapter();
  // Both callers (root pathname + step) fired before the rail could capture.
  expect(x.screens).toEqual([]);

  // The spine in production order: canonical UID -> awaited identify -> ready.
  x.setIdentity({ userId: 'uid', generation: 1, ready: false });
  await x.adapter.identify('uid');
  x.setIdentity({ userId: 'uid', generation: 1, ready: true });
  // The identity event that flips `ready` is the production replay trigger.
  x.adapter.replayPendingScreens();
  await flushAdapter();

  expect(x.screens).toEqual([{ name: 'onboarding', props: { step: 'O01' } }]);
});
