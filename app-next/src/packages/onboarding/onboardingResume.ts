import { onboardingStore } from './onboardingStore';
import { resumeStep, type FlowOrder } from './lib/flow';
import { beginOnboarding, beginPaywall } from '../journey/index';
import { canResumeFirstOnboarding, createAsyncStorageOtaStorage, runningOnboardingFlowVersion } from '../updates/updates';

let preparing: Promise<void> | null = null;

export function prepareOnboardingResume(order: FlowOrder | null): Promise<void> {
  if (preparing) return preparing;
  preparing = (async () => {
    const storage = createAsyncStorageOtaStorage();
    const envelope = await storage.loadEnvelope();
    const state = onboardingStore.getState().data;
    const ota = envelope?.onboarding === true;
    if (ota) await storage.clearEnvelope();
    if (!ota && (!state.started || state.complete || state.step === 'P')) return;
    if (!ota && !await canResumeFirstOnboarding()) return;
    const version = runningOnboardingFlowVersion();
    const currentOrder = state.flowVersion === version ? state.flowOrder ?? order : order;
    const step = ota && envelope.route === '/paywall' ? 'P' : resumeStep(state, currentOrder);
    onboardingStore.getState().patch({ step, complete: step === 'P', flowVersion: version,
      flowOrder: currentOrder ? { preBranch: [...currentOrder.preBranch], tail: [...currentOrder.tail] } : null });
    if (step === 'P') beginPaywall();
    else if (state.started || step !== 'O01') beginOnboarding();
    await onboardingStore.persistBarrier();
  })();
  return preparing;
}
