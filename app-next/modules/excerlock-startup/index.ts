export function markInteractiveHome(): boolean {
  const module = require('./src/ExcerlockStartupModule').default as { markInteractiveHome(): boolean };
  return module.markInteractiveHome();
}
