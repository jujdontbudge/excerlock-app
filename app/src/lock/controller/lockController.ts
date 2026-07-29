import { desiredOsState, type Journal } from "@excerlock/ledger";

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
  localNow,
  setHomeFullLock,
  subscribeHomeAllowance,
} from "./ledgerSource";

/** Everything the lock surfaces render, in one immutable value. */
export type LockSnapshot = Readonly<{
  /** False until the boundary has answered for the first time. */
  ready: boolean;
  authorization: ScreenTimeAuthorizationStatus;
  selection: ScreenTimeSelectionSummary | null;
  shield: CurrentShieldState | null;
  lockWindows: readonly LockWindow[];
  fullLock: boolean;
}>;

export interface LockControllerOptions {
  screenTime?: ScreenTimeModule;
  /** The earn ledger the desired shield state is computed from. */
  journal?: () => Journal;
  /** Local wall-clock ms. */
  now?: () => number;
}

const INITIAL: LockSnapshot = Object.freeze({
  ready: false,
  authorization: "notDetermined" as const,
  selection: null,
  shield: null,
  lockWindows: [],
  fullLock: false,
});

/** Lock's one OS conversation: screens call verbs; the ledger decides shields. */
export class LockController {
  private readonly screenTime: ScreenTimeModule;
  private readonly journal: () => Journal;
  private readonly now: () => number;
  private readonly listeners = new Set<() => void>();
  private activeClients = 0;
  private allowanceReconciliation: Promise<void> = Promise.resolve();
  private suppressAllowanceSubscription = false;
  private unsubscribeAllowance: (() => void) | null = null;
  private unsubscribeShield: ScreenTimeUnsubscribe | null = null;
  private snapshot: LockSnapshot = INITIAL;

  public constructor(options: LockControllerOptions = {}) {
    this.screenTime = options.screenTime ?? getScreenTimeModule();
    this.journal = options.journal ?? homeJournal;
    this.now = options.now ?? localNow;
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
    this.unsubscribeAllowance ??= subscribeHomeAllowance(() => {
      this.patch({ fullLock: homeFullLock() });
      if (!this.suppressAllowanceSubscription) {
        void this.queueAllowanceReconciliation();
      }
    });
    this.unsubscribeShield ??= this.screenTime.subscribe((shield) => {
      this.patch({ shield });
    });
    await this.refresh();
  }

  public stop(): void {
    this.activeClients = Math.max(0, this.activeClients - 1);
    if (this.activeClients > 0) {
      return;
    }
    this.unsubscribeAllowance?.();
    this.unsubscribeAllowance = null;
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
    await this.queueAllowanceReconciliation();
  }

  private async applyDesiredState(
    selection: ScreenTimeSelectionHandle,
  ): Promise<void> {
    const desired = desiredOsState(this.journal(), homeLedgerConfig(), this.now());
    await this.screenTime.reconcile(selection, desired);
  }

  /** Serialize async reconciliation; every pass reads the latest allowance. */
  private queueAllowanceReconciliation(): Promise<void> {
    const reconcile = async () => {
      await this.refresh();
      const selection = this.snapshot.shield?.selection ?? null;
      if (selection !== null) {
        await this.applyDesiredState(selection);
        await this.refresh();
      }
    };
    this.allowanceReconciliation = this.allowanceReconciliation.then(
      reconcile,
      reconcile,
    );
    return this.allowanceReconciliation;
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

    this.patch({
      ready: true,
      authorization,
      shield,
      lockWindows,
      selection,
      fullLock: homeFullLock(),
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
