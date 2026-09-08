import { profileStore } from './profileStore';
import { rulesStore } from './rulesStore';
import { ruleDaysStore } from './ruleDaysStore';
import { sessionStore } from './sessionStore';
import { entitlementStore } from './entitlementStore';
import { permissionsStore } from './permissionsStore';
import { settingsStore } from './settingsStore';
import { onboardingStore } from './onboardingStore';
import { gymVisitsStore } from './gymVisitsStore';
import { historyStore } from './historyStore';
export const stores = [
  profileStore,
  rulesStore,
  ruleDaysStore,
  sessionStore,
  entitlementStore,
  permissionsStore,
  settingsStore,
  onboardingStore,
  historyStore,
  gymVisitsStore,
];
export async function hydrateStores() {
  await Promise.all(stores.map((store) => store.persist.rehydrate()));
}
export function resetStores() {
  for (const store of stores) store.getState().reset();
}
