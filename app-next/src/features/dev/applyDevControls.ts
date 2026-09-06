import { onboardingStore } from '../../state/onboardingStore';
import { RuntimeControls } from '../../ports/RuntimeControls';
export type DevParams = { scenario?: string; restore?: string; outcome?: string; prompt?: string; setup?: string };
export async function applyDevControls(dev: RuntimeControls, p: DevParams) {
  if (p.scenario) await dev.load(p.scenario);
  if (p.setup && /^X[1-5]$/.test(p.setup))
    onboardingStore.getState().patch({ complete: true, setupComplete: false, setupStep: p.setup });
  if (p.restore === 'restored' || p.restore === 'notFound') dev.setRestoreOutcome(p.restore);
  if (p.outcome === 'success' || p.outcome === 'cancel' || p.outcome === 'error') dev.setOutcome(p.outcome);
  if (p.prompt === 'grant' || p.prompt === 'deny' || p.prompt === 'ask') dev.setPromptMode(p.prompt);
}
