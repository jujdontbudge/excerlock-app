import { settingsStore } from '../state/settingsStore';
import { Scenario } from '../ports/models';
import { hydrateStores, resetStores } from '../state/stores';
import { profileStore } from '../state/profileStore';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { permissionsStore } from '../state/permissionsStore';
import { sessionStore } from '../state/sessionStore';
import { entitlementStore } from '../state/entitlementStore';
import { onboardingStore } from '../state/onboardingStore';
export async function loadScenario(scenario: Scenario, keepEdits = false) {
  await hydrateStores();
  if (keepEdits) return;
  resetStores();
  settingsStore.getState().patch({ gymPlaces: scenario.gym?.places ?? [] });
  profileStore.getState().patch(scenario.profile ?? {});
  rulesStore.getState().patch({ rules: scenario.rules, lockedApps: scenario.lockedApps });
  ruleDaysStore.getState().patch({ days: scenario.ruleDays, walkingSession: scenario.walkingSession ?? null, gymPresence: null });
  permissionsStore.getState().patch(scenario.permissions);
  sessionStore.getState().patch({ session: scenario.session });
  entitlementStore.getState().patch({ entitlement: scenario.entitlement });
  const complete = scenario.onboarding === 'complete';
  onboardingStore.getState().patch({
    step: scenario.onboarding.startsWith('resumeAt:') ? scenario.onboarding.slice(9) : 'O01',
    complete,
    setupComplete: complete,
    answers: scenario.onboarding.startsWith('resumeAt:')
      ? { activity: 'walking', place: 'outside', walkingMode: 'target', goal: 5000 }
      : {},
  });
}
