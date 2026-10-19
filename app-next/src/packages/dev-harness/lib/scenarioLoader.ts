import { dayKey } from '../../schedule/calendar';
import { exportBankAccountData, importBankAccountData } from '../../bank/AccountData';
import { syncBankCondition } from '../../bank/BankLifecycle';
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
import { authorizeDemoScenario } from '../../identity/rememberedSignIn';
import { beginLaunch } from '../../journey/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PURCHASE_RECOVERY_KEY } from '../../subscription/PurchaseRecoveryJournal';
import { createAsyncStorageOtaStorage } from '../../updates/updates';
import { showcaseModeStore } from '../../progress/showcaseModeStore';
export async function loadScenario(scenario: Scenario, keepEdits = false) {
  await hydrateStores();
  beginLaunch();
  authorizeDemoScenario(scenario.launchSignInRequired === true || scenario.onboarding !== 'complete' || Boolean(scenario.identityLab));
  if (keepEdits) return;
  const otaStorage = createAsyncStorageOtaStorage();
  if (scenario.otaResumeRoute) {
    await otaStorage.saveEnvelope({
      route: scenario.otaResumeRoute,
      draftIds: [],
      savedAtMs: Date.parse(scenario.clock.now),
    });
  } else await otaStorage.clearEnvelope();
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
  if (scenario.showcase) showcaseModeStore.getState().patch({ on: true });
  settingsStore.getState().patch({ gymPlaces: scenario.gym?.places ?? [], units: scenario.profile?.units ?? settingsStore.getState().data.units, gymAutoDetect: scenario.gym?.autoDetect ?? false, gymBackgroundAsked: scenario.gym?.backgroundAsked ?? false, gymAutoDetectOptOut: scenario.gym?.optOut ?? false });
  profileStore.getState().patch(scenario.profile ?? {});
  rulesStore.getState().patch({ rules: scenario.rules, lockedApps: scenario.lockedApps });
  if (scenario.bank) {
    syncBankCondition(scenario.clock.now, scenario.clock.timezone);
    const account = exportBankAccountData().account;
    if (account) {
      const day = dayKey(scenario.clock.now, scenario.clock.timezone);
      await importBankAccountData({ account: { ...account, ...scenario.bank, earningRanges: undefined, days: { [day]: { difficulty: account.difficulty, amount: scenario.steps.today, points: scenario.bank.pendingPoints, through: Date.parse(scenario.clock.now) } } } });
    }
  }
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
