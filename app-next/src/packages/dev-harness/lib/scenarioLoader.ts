import { settingsStore } from '../../preferences/settingsStore';
import { Scenario } from '../../model/models';
import { hydrateStores, resetStores } from '../../launch/stores';
import { profileStore } from '../../preferences/profileStore';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { permissionsStore } from '../../permissions/permissionsStore';
import { sessionStore } from '../../identity/sessionStore';
import { entitlementStore } from '../../subscription/entitlementStore';
import { onboardingStore } from '../../onboarding/onboardingStore';
import { authorizeDemoScenario } from '../../identity/launchSignInGate';
import { beginWelcome } from '../../journey/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PURCHASE_RECOVERY_KEY } from '../../subscription/PurchaseRecoveryJournal';
export async function loadScenario(scenario: Scenario, keepEdits = false) {
  await hydrateStores();
  beginWelcome();
  authorizeDemoScenario(scenario.launchSignInRequired === true || scenario.onboarding !== 'complete' || Boolean(scenario.identityLab));
  if (keepEdits) return;
  if (scenario.purchaseRecovery) {
    const startedAt = scenario.clock.now;
    await AsyncStorage.setItem(PURCHASE_RECOVERY_KEY, JSON.stringify({
      version: 1,
      type: scenario.purchaseRecovery,
      operation: 'purchase',
      operationId: `purchase:lab-checkout-1:${startedAt}`,
      checkoutUserId: 'lab-checkout-1',
      startedAt,
      ...(scenario.purchaseRecovery === 'accountConnection' ? { confirmedAt: startedAt } : {}),
    }));
  } else await AsyncStorage.removeItem(PURCHASE_RECOVERY_KEY);
  resetStores();
  settingsStore.getState().patch({ gymPlaces: scenario.gym?.places ?? [] });
  profileStore.getState().patch(scenario.profile ?? {});
  rulesStore.getState().patch({ rules: scenario.rules, lockedApps: scenario.lockedApps });
  ruleDaysStore.getState().patch({ days: scenario.ruleDays, gymPresence: null });
  permissionsStore.getState().patch(scenario.permissions);
  sessionStore.getState().patch({ session: scenario.session });
  entitlementStore.getState().patch({ entitlement: scenario.entitlement });
  const complete = scenario.onboarding === 'complete';
  onboardingStore.getState().patch({
    step: scenario.onboarding.startsWith('resumeAt:') ? scenario.onboarding.slice(9) : 'O01',
    complete,
    setupComplete: complete,
    answers: scenario.onboarding.startsWith('resumeAt:')
      ? { activity: 'walking', walkingMode: 'steps', goal: 5000, ...scenario.onboardingAnswers }
      : {},
  });
}
