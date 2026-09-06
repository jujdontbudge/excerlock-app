import { RuntimeControls } from '../../ports/RuntimeControls';
export type DevParams = { scenario?: string; restore?: string; outcome?: string; prompt?: string };
export async function applyDevControls(dev: RuntimeControls, p: DevParams) {
  if (p.scenario) await dev.load(p.scenario);
  if (p.restore === 'restored' || p.restore === 'notFound') dev.setRestoreOutcome(p.restore);
  if (p.outcome === 'success' || p.outcome === 'cancel' || p.outcome === 'error') dev.setOutcome(p.outcome);
  if (p.prompt === 'grant' || p.prompt === 'deny' || p.prompt === 'ask') dev.setPromptMode(p.prompt);
}
