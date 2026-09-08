import { permissionsStore } from '../../state/permissionsStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { ScreenTimeAdapterDeps } from './ScreenTimeAdapter';

/**
 * The store-backed half of the adapter's dependencies, so composing it is the native half plus
 * this. Screens read the selection and the Screen Time permission from these stores, so the
 * picker's result and the authorization the OS returned have to land there — never the intent,
 * only what came back.
 *
 * `runtime/NativeScreenTime.ts` composes this with the native half and the runtime clock.
 */
export const screenTimeStoreBindings: Pick<ScreenTimeAdapterDeps, 'copy' | 'onSelection' | 'onAuthorization'> = {
  copy: () => ({
    rules: rulesStore.getState().data.rules,
    ruleDays: ruleDaysStore.getState().data.days,
    canNotify: permissionsStore.getState().data.notifications === 'granted',
  }),
  onSelection: (lockedApps) => rulesStore.getState().patch({ lockedApps }),
  onAuthorization: (screenTime) => permissionsStore.getState().patch({ screenTime }),
};
