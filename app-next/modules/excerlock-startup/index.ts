import module from './src/ExcerlockStartupModule';

export const STARTUP_STAGES = ['FirstReactRender', 'HydrationDone', 'RuntimeReady', 'BootGateRedirect'] as const;
export type StartupStage = (typeof STARTUP_STAGES)[number];

const marked = new Set<StartupStage>();
let highestMarkedIndex = -1;

export function markStartupStage(stage: StartupStage): boolean {
  if (marked.has(stage)) return true;
  const index = STARTUP_STAGES.indexOf(stage);
  if (index <= highestMarkedIndex) return false;
  if (!module) return false;
  try {
    if (!module.markStartupStage(stage)) return false;
  } catch {
    return false;
  }
  marked.add(stage);
  highestMarkedIndex = index;
  return true;
}

export function markInteractiveHome(): boolean {
  if (!module) return false;
  try {
    return module.markInteractiveHome();
  } catch {
    return false;
  }
}
