import { rule } from '../../../domain/__tests__/fixtures';
import { NATIVE_LOCKED_SELECTION } from '../../../engine/screentime/native/nativeSelection';
import { NativeScreenTimeModule } from '../../../engine/screentime/native/NativeScreenTimeModule';
import { permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { createScreenTimeAdapter } from '../ScreenTimeAdapter';
import { screenTimeStoreBindings } from '../storeBindings';
import { deviceActivityDouble, memoryStorage } from './DeviceActivityDouble';

const clock = { now: () => '2026-09-08T01:30:00.000Z', timezone: () => 'America/New_York' };

function bound(authorization: 0 | 1 | 2, counts = { applicationCount: 3, categoryCount: 2 }) {
  const native = deviceActivityDouble({ authorization });
  const module = new NativeScreenTimeModule({
    deviceActivity: native.api,
    picker: { pick: async () => counts },
    nowMs: () => Date.parse(clock.now()),
    storage: memoryStorage(),
  });
  const adapter = createScreenTimeAdapter({
    module,
    deviceActivity: native.api,
    clock,
    ...screenTimeStoreBindings,
  });
  return { native, adapter };
}

test('the picker writes the chosen selection and the returned authorization to the stores', async () => {
  rulesStore.getState().patch({ rules: [rule], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } });
  permissionsStore.getState().patch({ screenTime: 'notDetermined', notifications: 'granted' });
  const { adapter } = bound(0);

  await adapter.presentAppPicker();

  expect(rulesStore.getState().data.lockedApps).toEqual({
    handle: { token: NATIVE_LOCKED_SELECTION },
    appCount: 3,
    categoryCount: 2,
  });
  expect(permissionsStore.getState().data.screenTime).toBe('granted');
  expect(screenTimeStoreBindings.copy()).toEqual({ rules: [rule], ruleDays: [], canNotify: true });
  adapter.dispose();
});

test('a refused authorization is recorded as denied, never as granted', async () => {
  permissionsStore.getState().patch({ screenTime: 'notDetermined' });
  const { adapter } = bound(1);

  await adapter.requestAuthorization();

  expect(permissionsStore.getState().data.screenTime).toBe('denied');
  adapter.dispose();
});
