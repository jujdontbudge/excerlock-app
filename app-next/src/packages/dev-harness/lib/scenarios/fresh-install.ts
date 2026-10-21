import { base } from './base';
import { emptyPermissions } from '../../../permissions/permissionsStore';
export const scenario0 = base('fresh-install', 'Fresh install', {
  onboarding: 'fresh',
  profile: { name: '' },
  rules: [],
  lockedApps: { handle: null, isEmpty: true },
  ruleDays: [],
  permissions: emptyPermissions,
  entitlement: { status: 'none', renewsAt: null },
  history: [],
  usageMinutesToday: null,
  steps: { today: 0 },
});
export const reviewVerificationUnavailable = base('review-verification-unavailable', 'Fresh sign-in with unavailable verification', {
  ...scenario0,
  id: 'review-verification-unavailable',
  subscriptionProof: 'unavailable' as const,
});

export const reviewAdmissionScenarios = [
  base('review-server-unknown', 'Review · no subscription mirror yet', { ...scenario0, id: 'review-server-unknown', admissionFailure: 'serverUnknown' }),
  base('review-store-retry', 'Review · StoreKit environment resolves on retry', { ...scenario0, id: 'review-store-retry', entitlement: { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' }, admissionFailure: 'storeRetry' }),
  base('review-pending-unavailable', 'Review · unfinished purchase with unavailable verification', { ...scenario0, id: 'review-pending-unavailable', onboarding: 'resumeAt:P', identityLab: { restore: 'restored' }, purchaseRecovery: 'accountConnection', admissionFailure: 'serverError' }),
  base('review-store-null', 'Review · unknown StoreKit environment', { ...scenario0, id: 'review-store-null', admissionFailure: 'storeNull' }),
  base('review-store-timeout', 'Review · StoreKit environment timeout', { ...scenario0, id: 'review-store-timeout', admissionFailure: 'storeTimeout' }),
  base('review-server-error', 'Review · admission server error', { ...scenario0, id: 'review-server-error', admissionFailure: 'serverError' }),
  base('review-server-timeout', 'Review · admission server timeout', { ...scenario0, id: 'review-server-timeout', admissionFailure: 'serverTimeout' }),
  base('review-offline', 'Review · offline after authentication', { ...scenario0, id: 'review-offline', admissionFailure: 'offline' }),
  base('review-verification-retry', 'Review · paid verification recovers on retry', { ...scenario0, id: 'review-verification-retry', entitlement: { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' }, admissionFailure: 'retry' }),
];
