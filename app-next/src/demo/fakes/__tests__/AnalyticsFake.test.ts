import { createRuntime } from '../../../runtime/createRuntime';
import { describeAnalyticsPort } from '../../../ports/__tests__/analyticsContract';

describeAnalyticsPort(() => createRuntime().analytics);

test('the fake records events into the dev event stream', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');

  runtime.analytics.track('condition_created', { activity: 'walking', mode: 'state' });
  runtime.analytics.screen('O01');

  expect(runtime.dev.snapshot().events.map(({ event }) => event)).toEqual([
    'condition_created',
    'screen',
  ]);
  runtime.dispose();
});

test('reset empties the stream, the way signing out drops the identity', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  runtime.analytics.track('shields_applied');

  runtime.analytics.reset();

  expect(runtime.dev.snapshot().events).toEqual([]);
  runtime.dispose();
});
