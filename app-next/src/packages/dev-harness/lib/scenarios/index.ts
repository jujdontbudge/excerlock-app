import { onboardingOtaResumeScenarios } from './onboarding-ota-resume';
import { permissionJourney, permissionConditionEntry, permissionGymSetup } from './permission-journey';
import { scenario0 } from './fresh-install';
import { conditionDemoScenarios } from './condition-demo-gate';
import { unlockScenarios } from './unlock';
import { identityLabScenarios } from './identity-lab';
import { scenario1 } from './onboarding-walking-resume';
import { returningUnpaidOtaHome, returningUnpaidOtaUnlock } from './returning-unpaid-ota';
import { scenario2 } from './home-locked-walking';
import { scenario3 } from './home-unlocked-met';
import { scenario4 } from './home-walking-session';
import { scenario5 } from './home-before-window';
import { scenario6 } from './home-no-rules';
import { scenario7 } from './home-permission-needed';
import { scenario8 } from './home-no-apps';
import { scenario9 } from './gym-arrival-user';
import { scenario10 } from './gym-time-user';
import { scenario13 } from './multi-rule-overlap';
import { scenario14 } from './window-crosses-midnight';
import { scenario15 } from './trial-active';
import { scenario16 } from './trial-expired';
import { scenario17 } from './billing-issue';
import {
  scenario18,
  returningSignedIn,
  returningUnpaid,
  returningUnpaidRemoteBypassAttempt,
  returningExpired,
  reinstallKeychain,
  subscriptionProofMatching,
  subscriptionProofWrongAccount,
  subscriptionProofWrongEnvironment,
  subscriptionProofUnavailable,
} from './signed-in-apple';
import { scenario19 } from './analytics-6-weeks';
import { scenario20 } from './analytics-day-zero';
import { scenario21 } from './analytics-no-measurement';
import { scenario22 } from './dynamic-type-xl';
import { scenario23 } from './reduce-motion';
import { scenario24 } from './walk-state-ready';
import { scenario25 } from './trial-lapsed-while-closed';
import { scenario26 } from './trial-lapses-in-session';
export const scenarios = [
  permissionJourney,
  permissionConditionEntry,
  permissionGymSetup,
  scenario0,
  scenario1,
  scenario2,
  scenario3,
  scenario4,
  scenario5,
  scenario6,
  scenario7,
  scenario8,
  scenario9,
  scenario10,
  scenario13,
  scenario14,
  scenario15,
  scenario16,
  scenario17,
  scenario18,
  returningSignedIn,
  returningUnpaid,
  returningUnpaidRemoteBypassAttempt,
  returningExpired,
  reinstallKeychain,
  returningUnpaidOtaHome,
  returningUnpaidOtaUnlock,
  subscriptionProofMatching,
  subscriptionProofWrongAccount,
  subscriptionProofWrongEnvironment,
  subscriptionProofUnavailable,
  scenario19,
  scenario20,
  scenario21,
  scenario22,
  scenario23,
  scenario24,
  scenario25,
  scenario26,
  ...unlockScenarios,
  ...onboardingOtaResumeScenarios,
  ...conditionDemoScenarios,
  ...identityLabScenarios,
];
