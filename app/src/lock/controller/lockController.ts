import type { Journal } from "@excerlock/ledger";

import {
  getScreenTimeModule,
  type CurrentShieldState,
  type LockWindow,
  type ScreenTimeAuthorizationStatus,
  type ScreenTimeModule,
  type ScreenTimeSelectionHandle,
  type ScreenTimeSelectionSummary,
  type ScreenTimeUnsubscribe,
} from "@/screentime";

import {
  homeFullLock,
  homeJournal,
  homeLedgerConfig,
  setHomeFullLock,
  subscribeHomeLedgerInputs,
} from "./ledgerSource";
import { lockAppNow } from "./appRuntime";
import type { LockPrecedenceDecision } from "../model/lockPrecedence";
import type {
  RecurringLockWindow,
  SaveRecurringLockWindowResult,
} from "../model/recurringLockWindow";
import {
  getLockScheduleStore,
  type LockScheduleStore,
} from "../store/lockScheduleStore";
import { desiredLockState } from "./lockPolicy";
import { syncScheduleRegistrations } from "./scheduleRegistration";

/** Everything the lock surfaces render, in one immutable value. */
export type LockSnapshot = Readonly<{
  /** False until the boundary has answered for the first time. */
  ready: boolean;
  authorization: ScreenTimeAuthorizationStatus;
  selection: ScreenTimeSelectionSummary | null;
  shield: CurrentShieldState | null;
  lockWindows: readonly LockWindow[];
  recurringWindows: readonly RecurringLockWindow[];
  fullLock: boolean;
  precedence: LockPrecedenceDecision;
}>;

export interface LockControllerOptions {
  screenTime?: ScreenTimeModule;
  /** The earn ledger the desired shield state is computed from. */
  journal?: () => Journal;
  /** Local wall-clock ms. */
  now?: () => number;
  /** Persisted recurring definitions; injected to isolate tests. */
  scheduleStore?: LockScheduleStore;
  /** Verified Walk & Scroll state; Phase 3 injects its live provider. */
  walking?: () => boolean;
}

const INITIAL: LockSnapshot = Object.freeze({
  ready: false,
  authorization: "notDetermined" as const,
  selection: null,
  shield: null,
  lockWindows: [],
  recurringWindows: [],
  fullLock: false,
  precedence: Object.freeze({
    shields: "up" as const,
    drainsBalance: false,
    cause: "emptyBalance" as const,
  }),
});

/** Lock's one OS conversation: screens call verbs; the ledger decides shields. */
export class LockController {
  private readonly screenTime: ScreenTimeModule;
  private readonly journal: () => Journal;
  private readonly now: () => number;
  private readonly scheduleStore: LockScheduleStore;
  private readonly walking: () => boolean;
  private readonly listeners = new Set<() => void>();
  private activeClients = 0;
  private reconciliation: Promise<void> = Promise.resolve();
  private suppressAllowanceSubscription = false;
  private unsubscribeLedgerInputs: (() => void) | null = null;
  private unsubscribeSchedule: (() => void) | null = null;
  private unsubscribeShield: ScreenTimeUnsubscribe | null = null;
  private snapshot: LockSnapshot = INITIAL;

  public constructor(options: LockControllerOptions = {}) {
    this.screenTime = options.screenTime ?? getScreenTimeModule();
    this.journal = options.journal ?? homeJournal;
    this.now = options.now ?? lockAppNow;
    this.scheduleStore = options.scheduleStore ?? getLockScheduleStore();
    this.walking = options.walking ?? (() => false);
  }

  public getSnapshot(): LockSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Attaches to the boundary's observable and loads the first snapshot. */
  public async start(): Promise<void> {
    this.activeClients += 1;
    await this.scheduleStore.load();
    this.patch({
      recurringWindows: this.scheduleStore.getSnapshot().windows,
    });
    this.unsubscribeSchedule ??= this.scheduleStore.subscribe(() => {
      this.patch({
        recurringWindows: this.scheduleStore.getSnapshot().windows,
      });
    });
    this.unsubscribeLedgerInputs ??= subscribeHomeLedgerInputs(() => {
      this.patch({ fullLock: homeFullLock() });
      if (!this.suppressAllowanceSubscription) {
        void this.queueReconciliation();
      }
    });
    this.unsubscribeShield ??= this.screenTime.subscribe((shield) => {
      const activeWindowChanged =
        this.snapshot.shield?.activeLockWindowId !==
        shield.activeLockWindowId;
      this.patch({ shield });
      if (activeWindowChanged) {
        void this.queueReconciliation();
      }
    });
    await this.refresh();
    const selection = this.snapshot.shield?.selection ?? null;
    if (selection !== null) {
      await this.syncConcreteWindows(selection);
      await this.queueReconciliation();
    }
  }

  public stop(): void {
    this.activeClients = Math.max(0, this.activeClients - 1);
    if (this.activeClients > 0) {
      return;
    }
    this.unsubscribeLedgerInputs?.();
    this.unsubscribeLedgerInputs = null;
    this.unsubscribeSchedule?.();
    this.unsubscribeSchedule = null;
    this.unsubscribeShield?.();
    this.unsubscribeShield = null;
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    const authorization = await this.screenTime.requestAuthorization();
    await this.refresh();
    return authorization;
  }

  /**
   * Opens the system picker. The handle it returns is opaque and stays that
   * way: it goes straight back to the boundary, and what the user sees is the
   * boundary's own summary of it.
   */
  public async pickApps(): Promise<ScreenTimeSelectionHandle | null> {
    if (this.snapshot.authorization !== "approved") {
      return null;
    }

    const selection = await this.screenTime.pickSelection();
    if (selection !== null) {
      await this.applyDesiredState(selection);
      await this.syncConcreteWindows(selection);
      if (this.scheduleStore.getSnapshot().windows.length > 0) {
        await this.applyDesiredState(selection);
      }
      await this.refresh();
    }
    return selection;
  }

  /** Full Lock is the owner's one allowance going to zero and coming back. */
  public async setFullLock(on: boolean): Promise<void> {
    this.suppressAllowanceSubscription = true;
    try {
      setHomeFullLock(on);
    } finally {
      this.suppressAllowanceSubscription = false;
    }
    await this.queueReconciliation();
  }

  public async saveRecurringLockWindow(
    window: RecurringLockWindow,
  ): Promise<SaveRecurringLockWindowResult> {
    const result = await this.scheduleStore.save(window);
    if (result.ok === false) {
      return result;
    }
    this.patch({ recurringWindows: result.windows });
    const selection = this.snapshot.shield?.selection ?? null;
    if (selection !== null) {
      await this.syncConcreteWindows(selection);
      await this.queueReconciliation();
    }
    return result;
  }

  public async deleteRecurringLockWindow(id: string): Promise<boolean> {
    const deleted = await this.scheduleStore.delete(id);
    if (!deleted) {
      return false;
    }
    this.patch({
      recurringWindows: this.scheduleStore.getSnapshot().windows,
    });
    const selection = this.snapshot.shield?.selection ?? null;
    if (selection !== null) {
      await this.syncConcreteWindows(selection);
      await this.queueReconciliation();
    }
    return true;
  }

  /** Test/UI await point for a boundary-driven start or end transition. */
  public whenReconciled(): Promise<void> {
    return this.reconciliation;
  }

  private async applyDesiredState(
    selection: ScreenTimeSelectionHandle,
  ): Promise<void> {
    const { decision, desired } = this.desiredState();
    this.patch({ precedence: decision });
    await this.screenTime.reconcile(selection, desired);
  }

  private desiredState() {
    return desiredLockState({
      journal: this.journal(),
      config: homeLedgerConfig(),
      atMs: this.now(),
      definitions: this.scheduleStore.getSnapshot().windows,
      fullLock: homeFullLock(),
      walking: this.walking(),
    });
  }

  private async syncConcreteWindows(
    selection: ScreenTimeSelectionHandle,
  ): Promise<void> {
    await syncScheduleRegistrations({
      screenTime: this.screenTime,
      selection,
      definitions: this.scheduleStore.getSnapshot().windows,
      atMs: this.now(),
    });
    await this.refresh();
  }

  /** Serialize async reconciliation; every pass reads the latest inputs. */
  private queueReconciliation(): Promise<void> {
    const reconcile = async () => {
      await this.refresh();
      const selection = this.snapshot.shield?.selection ?? null;
      if (selection !== null) {
        await this.applyDesiredState(selection);
        await this.refresh();
      }
    };
    this.reconciliation = this.reconciliation.then(
      reconcile,
      reconcile,
    );
    return this.reconciliation;
  }

  private async refresh(): Promise<void> {
    const [authorization, shield, lockWindows] = await Promise.all([
      this.screenTime.getAuthorizationStatus(),
      this.screenTime.getCurrentShieldState(),
      this.screenTime.getLockWindows(),
    ]);
    const selection =
      shield.selection === null
        ? null
        : await this.screenTime.describeSelection(shield.selection);

    const { decision } = this.desiredState();
    this.patch({
      ready: true,
      authorization,
      shield,
      lockWindows,
      selection,
      fullLock: homeFullLock(),
      recurringWindows: this.scheduleStore.getSnapshot().windows,
      precedence: decision,
    });
  }

  private patch(next: Partial<LockSnapshot>): void {
    this.snapshot = Object.freeze({ ...this.snapshot, ...next });
    this.listeners.forEach((listener) => listener());
  }
}

let sharedController: LockController | undefined;

/** One controller for the app's lifetime — a screen remount must not re-arm it. */
export function getLockController(): LockController {
  sharedController ??= new LockController();
  return sharedController;
}
