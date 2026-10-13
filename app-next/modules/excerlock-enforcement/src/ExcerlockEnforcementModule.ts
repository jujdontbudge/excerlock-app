import { NativeModule, requireNativeModule } from 'expo';
import type { EnforcementSnapshot } from '../../../src/packages/enforcement/EnforcementHost';
import type { ShieldCopyOverridesJson } from '../../../src/packages/enforcement/shieldCopyOverrides';
import type { WatchdogRegistration } from '../../../src/packages/ports/watchdog';

export class ExcerlockEnforcementModule extends NativeModule {
  getPolicyRevision!: () => number;
  watchdogWarning?: boolean;
  publish!: (snapshot: EnforcementSnapshot) => Promise<readonly string[]>;
  shield!: (revision: number) => Promise<boolean>;
  unshield!: (revision: number) => Promise<boolean>;
  stageWatchdog!: (plan: WatchdogRegistration, revision: number) => Promise<string>;
  commitWatchdog!: (id: string, revision: number) => Promise<boolean>;
  cancelWatchdogs!: (revision: number) => Promise<void>;
  replaceWindows!: (windows: { id: string; start: number; end: number }[], revision: number) => Promise<void>;
  setShieldCopyOverrides!: (json: ShieldCopyOverridesJson) => Promise<void>;
}
export default requireNativeModule<ExcerlockEnforcementModule>('ExcerlockEnforcement');
