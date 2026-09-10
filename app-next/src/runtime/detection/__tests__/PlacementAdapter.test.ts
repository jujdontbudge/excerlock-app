import { FixturePhonePlacementProvider } from '../../../engine/signals/placement/FixturePhonePlacementProvider';
import recordings from '../../../engine/signals/placement/__tests__/fixtures/treadmillRecordings.json';
import { PlacementAdapter } from '../PlacementAdapter';
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
