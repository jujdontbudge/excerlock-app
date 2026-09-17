import module from './src/ExcerlockStartupModule';

/**
 * Ordered cold-start stage boundaries, named exactly as the native os_signpost
 * events (`modules/excerlock-startup/ios/ExcerlockStartupModule.swift`). The
 * JS contract test reads that Swift source and fails on drift.
 */
export const STARTUP_STAGES = ['FirstReactRender', 'HydrationDone', 'RuntimeReady', 'BootGateRedirect'] as const;
export type StartupStage = (typeof STARTUP_STAGES)[number];

/**
 * Diagnostic-only: one mark per stage. Stage boundaries may skip a stage (a
 * headless launch reaches hydration and runtime before React ever renders) but
 * must never report an earlier boundary after a later one.
 */
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
