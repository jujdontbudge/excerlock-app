import type { EnforcementSnapshot, EnforcementTransport } from './EnforcementHost';
import type { WatchdogRegistration } from '../ports/watchdog';
import type { ExcerlockEnforcementModule } from '../../../modules/excerlock-enforcement/src/ExcerlockEnforcementModule';

export class NativeEnforcementTransport implements EnforcementTransport {
  constructor(private readonly native: ExcerlockEnforcementModule) {}
  async publish(snapshot: EnforcementSnapshot): Promise<void> { await this.native.publish(snapshot); }
  shield(revision: number): Promise<boolean> { return this.native.shield(revision); }
  unshield(revision: number): Promise<boolean> { return this.native.unshield(revision); }
  stageWatchdog(plan: WatchdogRegistration, revision: number): Promise<string> { return this.native.stageWatchdog(plan, revision); }
  commitWatchdog(id: string, revision: number): Promise<boolean> { return this.native.commitWatchdog(id, revision); }
  cancelWatchdogs(revision: number): Promise<void> { return this.native.cancelWatchdogs(revision); }
  replaceWindows(windows: { id: string; start: number; end: number }[], revision: number): Promise<void> { return this.native.replaceWindows(windows, revision); }
  policyRevision(): number { return this.native.getPolicyRevision(); }
  fastWatchdog(): boolean { return this.native.watchdogWarning === true; }
}
