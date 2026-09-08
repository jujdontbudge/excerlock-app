import { describeScreenTimePort } from '../../../ports/__tests__/screenTimeContract';
import { screenTimeSubject } from './harness';

// The contract runs against the adapter over the real ported engine: only the DeviceActivity
// package is doubled. The clock matches the contract's own plan, whose window contains it.
describeScreenTimePort(async () => {
  const { adapter } = await screenTimeSubject({ now: '2026-09-07T13:00:00.000Z', timezone: 'UTC' });
  return { port: adapter, dispose: adapter.dispose };
});
