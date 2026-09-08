import { permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { rule } from '../../../domain/__tests__/fixtures';
import { LOCKED_SELECTION_ID } from '../deviceActivity';
import { createScreenTimeAdapter } from '../ScreenTimeAdapter';
import { screenTimeStoreBindings } from '../storeBindings';
import { deviceActivityDouble } from './DeviceActivityDouble';

test('the picker writes the chosen selection and the returned authorization to the stores', async () => {
  rulesStore.getState().patch({ rules: [rule], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } });
  permissionsStore.getState().patch({ screenTime: 'notDetermined', notifications: 'granted' });
  const native = deviceActivityDouble({ authorization: 0 });
  const adapter = createScreenTimeAdapter({
    native: native.api,
    clock: { now: () => '2026-09-07T18:00:00.000Z', timezone: () => 'America/New_York' },
    picker: { pick: async () => ({ applicationCount: 3, categoryCount: 2 }) },
    ...screenTimeStoreBindings,
  });

  await adapter.presentAppPicker();

  expect(rulesStore.getState().data.lockedApps).toEqual({
    handle: { token: LOCKED_SELECTION_ID },
    appCount: 3,
    categoryCount: 2,
  });
  expect(permissionsStore.getState().data.screenTime).toBe('granted');
  expect(screenTimeStoreBindings.copy()).toEqual({ rules: [rule], ruleDays: [], canNotify: true });
  adapter.dispose();
});

test('a refused authorization is recorded as denied, never as granted', async () => {
  permissionsStore.getState().patch({ screenTime: 'notDetermined' });
  const native = deviceActivityDouble({ authorization: 1 });
  const adapter = createScreenTimeAdapter({
    native: native.api,
    clock: { now: () => '2026-09-07T18:00:00.000Z', timezone: () => 'America/New_York' },
    ...screenTimeStoreBindings,
  });

  await adapter.requestAuthorization();

  expect(permissionsStore.getState().data.screenTime).toBe('denied');
  adapter.dispose();
});
