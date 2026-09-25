import { historyStore } from '../progress/historyStore';
import { profileStore } from '../preferences/profileStore';
import { rulesStore } from '../conditions/rulesStore';
import { ruleDaysStore } from '../conditions/ruleDaysStore';
import { sessionStore } from '../identity/sessionStore';
import { entitlementStore } from '../subscription/entitlementStore';
import { permissionsStore } from '../permissions/permissionsStore';
import { settingsStore } from '../preferences/settingsStore';
import { onboardingStore } from '../onboarding/onboardingStore';
export const stores = [
  historyStore,
  profileStore,
  rulesStore,
  ruleDaysStore,
  sessionStore,
  entitlementStore,
  permissionsStore,
  settingsStore,
  onboardingStore,
];
export async function hydrateStores() {
  await Promise.all(stores.map((store) => store.persist.rehydrate()));
}
export function resetStores() {
  for (const store of stores) store.getState().reset();
}
