import module from './src/ExcerlockStartupModule';

export function markInteractiveHome(): boolean {
  if (!module) return false;
  try {
    return module.markInteractiveHome();
  } catch {
    return false;
  }
}
