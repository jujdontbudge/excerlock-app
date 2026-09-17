import { Slot } from 'expo-router';
import { Text } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { createRuntime } from '../../../runtime/createRuntime';
import type { Runtime } from '../../../runtime/Runtime';
import type { RuntimeStatusSnapshot } from '../../../ports/RuntimeStatusPort';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { BootGate } from '../BootGate';
import { onboardingStore } from '../../../state/onboardingStore';
import { hydrateStores } from '../../../state/stores';

jest.mock('../../../../modules/excerlock-startup', () => ({
  markStartupStage: jest.fn(() => true),
  markInteractiveHome: () => false,
}));
const { markStartupStage } = jest.requireMock('../../../../modules/excerlock-startup') as {
  markStartupStage: jest.Mock<boolean, [string]>;
};

function routes(runtime: Runtime) {
  return {
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <Slot />
      </AppRuntimeProvider>
    ),
    index: BootGate,
    '(tabs)/home': () => <Text>Home</Text>,
  };
}

function settledRuntime(): Runtime {
  const runtime = createRuntime('fake');
  const settled: RuntimeStatusSnapshot = { hydrated: true, loading: false, history: [] };
  jest.spyOn(runtime.status, 'snapshot').mockReturnValue(settled);
  return runtime;
}

beforeEach(async () => {
  markStartupStage.mockClear();
  await hydrateStores();
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ complete: true, setupComplete: true });
});

test('marks the BootGate redirect stage in the commit that issues the redirect', async () => {
  const runtime = settledRuntime();
  const routed = renderRouter(routes(runtime), { initialUrl: '/' });
  const rendered = await routed;

  expect(routed.getPathname()).toBe('/home');
  expect(markStartupStage).toHaveBeenCalledTimes(1);
  expect(markStartupStage).toHaveBeenCalledWith('BootGateRedirect');
  await rendered.unmount();
  runtime.dispose();
});

test('does not mark the redirect stage while the gate still shows boot', async () => {
  const runtime = createRuntime('fake');
  jest.spyOn(runtime.status, 'snapshot').mockReturnValue({ hydrated: true, loading: true, history: [] });
  const routed = renderRouter(routes(runtime), { initialUrl: '/' });
  const rendered = await routed;

  expect(routed.getPathname()).toBe('/');
  expect(markStartupStage).not.toHaveBeenCalled();
  await rendered.unmount();
  runtime.dispose();
});
