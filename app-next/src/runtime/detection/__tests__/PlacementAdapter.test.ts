import { FixturePhonePlacementProvider } from '../../../engine/signals/placement/FixturePhonePlacementProvider';
import recordings from '../../../engine/signals/placement/__tests__/fixtures/treadmillRecordings.json';
import { PlacementAdapter } from '../PlacementAdapter';
import type { PhonePlacementProvider } from '../../../engine/signals/placement/PhonePlacementProvider';
test('maps the existing device-recorded classifier without retuning its latency', async () => {
  const provider = new FixturePhonePlacementProvider(recordings.proppedOnRunningBelt);
  const adapter = new PlacementAdapter(provider);
  await adapter.start();
  const end = recordings.proppedOnRunningBelt.at(-1)!.timestampMs;
  provider.advanceTo(end);
  expect(adapter.reconcile(end).placement).toBe('propped');
  expect(adapter.reconcile(end + 5001).placement).toBe('unknown');
  await adapter.stop();
});
test('recorded in-hand walking maps to handheld, never propped', async () => {
  const provider = new FixturePhonePlacementProvider(recordings.inHandWalking);
  const adapter = new PlacementAdapter(provider);
  await adapter.start();
  const end = recordings.inHandWalking.at(-1)!.timestampMs;
  provider.advanceTo(end);
  expect(adapter.reconcile(end).placement).toBe('handheld');
});

test('stop reaches the provider when removing the sample subscription throws', async () => {
  const provider = {
    onSample: () => () => { throw new Error('remove failed'); },
    start: async () => {}, stop: jest.fn(async () => {}),
  } as unknown as PhonePlacementProvider;
  const adapter = new PlacementAdapter(provider);
  await adapter.start();
  await expect(adapter.stop()).rejects.toThrow('remove failed');
  expect(provider.stop).toHaveBeenCalledTimes(1);
});
