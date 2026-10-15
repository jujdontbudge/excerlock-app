import { AppState } from 'react-native';
import { BankDrainUsageChanged, type BankDrainPort, type BankDrainUsage } from '../ports/BankDrainPort';
import type { BankDrainDiagnosticState } from '../ports/BankDrainDiagnosticPort';
import type { ClockPort } from '../ports/ClockPort';
import type { BankDrainNativeUsage } from '../../../modules/excerlock-enforcement/src/ExcerlockEnforcementModule';
import { getExcerlockEnforcementModule } from '../../../modules/excerlock-enforcement';

const emptyUsage = (): BankDrainUsage => ({ usedMinutes: 0, observedAt: new Date(0).toISOString() });
export class NativeBankDrain implements BankDrainPort {
  private readonly native = getExcerlockEnforcementModule();
  private readonly listeners = new Set<(usage: BankDrainUsage) => void>();
  private last: BankDrainUsage | null = null;
  private receipt: BankDrainNativeUsage | null = null;
  private spikeReceipt: BankDrainNativeUsage | null = null;
  private queued: Promise<unknown> = Promise.resolve();
  private polling: Promise<void> | null = null;
  private stopClock: (() => void) | null = null;
  private foreground: { remove(): void } | null = null;
  private disposed = false;

  get available(): boolean {
    return Boolean(this.native.armBankDrain);
  }

  constructor(private readonly clock: ClockPort, private readonly reportError: (error: unknown) => void) {}

  arm(bankMinutes: number): Promise<void> {
    const receipt = this.receipt;
    return this.mutate(async () => {
      if (!this.native.armBankDrain) throw new Error('Bank drain requires a new native build');
      await this.native.armBankDrain(bankMinutes, receipt?.armId ?? null, receipt?.usedMinutes ?? 0);
      this.receipt = null;
      this.last = null;
    });
  }

  disarm(): Promise<void> {
    return this.mutate(async () => {
      const receipt = this.receipt;
      const disarmed = await this.native.disarmBankDrain?.(receipt?.armId ?? null, receipt?.usedMinutes ?? 0);
      if (disarmed === false) throw new BankDrainUsageChanged();
      this.receipt = null;
      this.spikeReceipt = null;
      this.last = null;
    });
  }

  usage(): Promise<BankDrainUsage> {
    return this.readUsage(true);
  }

  private readUsage(booked: boolean): Promise<BankDrainUsage> {
    const reading = this.queued.then(async () => {
      const next = this.native.bankDrainUsage ? await this.native.bankDrainUsage() : { ...emptyUsage(), armId: null };
      if (booked) this.receipt = next;
      return next;
    });
    this.queued = reading.catch(() => undefined);
    return reading;
  }

  subscribe(callback: (usage: BankDrainUsage) => void): () => void {
    if (this.disposed) throw new Error('Bank drain adapter disposed');
    this.listeners.add(callback);
    if (!this.stopClock) {
      this.stopClock = this.clock.subscribe(() => this.poll());
      this.foreground = AppState.addEventListener('change', state => { if (state === 'active') this.poll(); });
    }
    this.poll();
    return () => {
      this.listeners.delete(callback);
      if (!this.listeners.size) this.stopPolling();
    };
  }

  async diagnostics(): Promise<BankDrainDiagnosticState> {
    await this.queued;
    if (__DEV__ && this.native.bankDrainDiagnostics) {
      await this.native.bankDrainUsage?.();
      const state = await this.native.bankDrainDiagnostics();
      this.spikeReceipt = state;
      return state;
    }
    return {
      ...emptyUsage(), available: false, phase: 'disarmed', bankMinutes: 0, armedAt: null,
      tickMinutes: 1, eventCount: 0, monitorRegistered: false, activeMonitorCount: 0,
      shieldConfigured: false, failure: null, ticks: [],
    };
  }

  armSpike(minutes: number, tickMinutes: 1 | 5): Promise<void> {
    const receipt = this.spikeReceipt;
    return this.mutate(async () => {
      if (!__DEV__ || !this.native.armBankDrainSpike) throw new Error('Bank drain spike requires a debug native build');
      await this.native.armBankDrainSpike(minutes, tickMinutes, receipt?.armId ?? null, receipt?.usedMinutes ?? 0);
      this.spikeReceipt = null;
      this.receipt = null;
      this.last = null;
    });
  }

  dispose(): void {
    this.disposed = true;
    this.stopPolling();
    this.listeners.clear();
  }

  private mutate(operation: () => Promise<void>): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Bank drain adapter disposed'));
    const result = this.queued.then(operation);
    this.queued = result.catch(() => undefined);
    return result.finally(() => this.poll());
  }

  private poll(): void {
    if (this.disposed || !this.listeners.size || this.polling || AppState.currentState !== 'active') return;
    this.polling = this.readUsage(false).then(usage => {
      if (this.disposed) return;
      if (this.last?.usedMinutes === usage.usedMinutes && this.last.observedAt === usage.observedAt && this.last.armId === usage.armId && this.last.failed === usage.failed) return;
      this.last = usage;
      this.listeners.forEach(listener => listener(usage));
    }).catch(this.reportError).finally(() => { this.polling = null; });
  }

  private stopPolling(): void {
    this.stopClock?.();
    this.stopClock = null;
    this.foreground?.remove();
    this.foreground = null;
  }
}
