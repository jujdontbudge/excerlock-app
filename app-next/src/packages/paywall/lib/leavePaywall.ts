import type { useRouter } from 'expo-router';
import { onboardingStore } from '../../onboarding/onboardingStore';
import { beginOnboarding, beginWelcome } from '../../journey/index';
import type { Runtime } from '../../ports/Runtime';

export function leavePaywall(runtime: Runtime, router: ReturnType<typeof useRouter>) {
  const { setupComplete, answers } = onboardingStore.getState().data;
  if (setupComplete || Object.keys(answers).length === 0) {
    beginWelcome();
    router.replace('/onboarding/O01');
    return;
  }
  const step = runtime.onboardingOffer?.snapshot().trialAvailable === false ? 'S3e' : 'S3d';
  onboardingStore.getState().patch({ step, complete: false });
  beginOnboarding();
  router.replace(`/onboarding/${step}`);
}
