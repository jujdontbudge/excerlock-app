import { NativeModule, requireNativeModule } from 'expo';
import type { EnforcementSnapshot } from '../../../src/runtime/enforcement/EnforcementHost';
import type { WatchdogRegistration } from '../../../src/domain/watchdog';

export class ExcerlockEnforcementModule extends NativeModule {
  publish!: (snapshot: EnforcementSnapshot) => Promise<readonly string[]>;
  shield!: (revision: number) => Promise<boolean>;
  unshield!: (revision: number) => Promise<boolean>;
  stageWatchdog!: (plan: WatchdogRegistration, revision: number) => Promise<string>;
  commitWatchdog!: (id: string, revision: number) => Promise<boolean>;
  cancelWatchdogs!: (revision: number) => Promise<void>;
  replaceWindows!: (windows: { id: string; start: number; end: number }[], revision: number) => Promise<void>;
}
export default requireNativeModule<ExcerlockEnforcementModule>('ExcerlockEnforcement');
