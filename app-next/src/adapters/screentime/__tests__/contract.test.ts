import { describeScreenTimePort } from '../../../ports/__tests__/screenTimeContract';
import { createScreenTimeAdapter } from '../ScreenTimeAdapter';
import { deviceActivityDouble } from './DeviceActivityDouble';

describeScreenTimePort(async () => {
  const native = deviceActivityDouble();
  const port = createScreenTimeAdapter({
    native: native.api,
    clock: { now: () => '2026-09-07T13:00:00.000Z', timezone: () => 'America/New_York' },
    copy: () => ({ rules: [], ruleDays: [], canNotify: true }),
  });
  return { port, dispose: port.dispose };
});
