import type { ExcerlockEnforcementModule } from './src/ExcerlockEnforcementModule';
export function getExcerlockEnforcementModule(): ExcerlockEnforcementModule {
  return (require('./src/ExcerlockEnforcementModule') as { default: ExcerlockEnforcementModule }).default;
}
