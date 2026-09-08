import { createRuntime } from '../../../runtime/createRuntime';
import { describeScreenTimePort } from '../../../ports/__tests__/screenTimeContract';

describeScreenTimePort(async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  return { port: runtime.screenTime, dispose: runtime.dispose };
});

test('describeSelection reports the loaded scenario selection', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  await expect(runtime.screenTime.describeSelection()).resolves.toEqual({
    handle: { token: 'fake-selection-default' },
    appCount: 3,
    categoryCount: 1,
  });
  runtime.dispose();
});

test('RuntimeControls.invalidateSelection makes describeSelection return the empty selection', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  runtime.dev.invalidateSelection();
  await expect(runtime.screenTime.describeSelection()).resolves.toEqual({
    handle: null,
    appCount: 0,
    categoryCount: 0,
  });
  runtime.dispose();
});
