import { dayKey } from '../../domain/calendar';
import { EnforcementPlan } from '../../domain/enforcement';
import { assertMonitorBudget, MonitorPlan } from '../../domain/monitorPlan';
import { ShieldCause, shieldContent, ShieldContent, shieldContentSet } from '../../domain/shieldContent';
import { LockDecision, LockedApps, PermissionStatus, Rule, RuleDay } from '../../domain/types';
import { effectiveNow, nextWatermark } from '../../domain/watermark';
import { ApplyResult, ScreenTimePort } from '../../ports/ScreenTimePort';
import { monitorActions, openWindow, OpenWindow } from './actions';
import { EnforcementFacts, writeFacts } from './appGroup';
import {
  DeviceActivityApi,
  DeviceActivityAuthorizationStatus,
  LOCKED_SELECTION_ID,
  MISSING_SELECTION_PICKER,
  SelectionPicker,
} from './deviceActivity';
import { leaseSchedule, LEASE_MONITOR, monitorSchedule } from './schedules';
import { publishShieldContent } from './shieldPublisher';
import { armUsageMonitor, measuredDay, refreshUsage } from './usage';

/** What the shield says. The domain owns the strings; the adapter only needs the inputs. */
export type ShieldCopySource = () => { rules: Rule[]; ruleDays: RuleDay[]; canNotify: boolean };

export type ScreenTimeAdapterDeps = {
  native: DeviceActivityApi;
  clock: { now(): string; timezone(): string };
  picker?: SelectionPicker;
  copy: ShieldCopySource;
  /** Screens read the selection from the rules store, so the picker's result has to land there. */
  onSelection?: (selection: LockedApps) => void;
  onAuthorization?: (status: PermissionStatus) => void;
};

export interface ScreenTimeAdapter extends ScreenTimePort {
  /** Minutes measured for a local day, or `null` for a day no monitor covered. */
  measuredUsage(day: string): number | null;
  dispose(): void;
}

const PERMISSIONS: Record<DeviceActivityAuthorizationStatus, PermissionStatus> = {
  0: 'notDetermined',
  1: 'denied',
  2: 'granted',
};

const EMPTY: LockedApps = { handle: null, appCount: 0, categoryCount: 0 };
const SELECTION = { activitySelectionId: LOCKED_SELECTION_ID };

/**
 * `resolveLock` decides; this applies. Every branch below either raises the shield or leaves it
 * raised, so no failure can be the reason a user's apps opened.
 */
export function createScreenTimeAdapter({
  native,
  clock,
  picker = MISSING_SELECTION_PICKER,
  copy,
  onSelection,
  onAuthorization,
}: ScreenTimeAdapterDeps): ScreenTimeAdapter {
  const enforcementListeners = new Set<(result: ApplyResult) => void>();
  const usageListeners = new Set<(minutes: number | null) => void>();
  let settled: { key: string; result: ApplyResult } | undefined;
  let watermark: string | null = null;
  let observedShields: 'up' | 'down' | null = null;

  const now = () => {
    const observed = clock.now();
    watermark = nextWatermark(observed, watermark);
    return effectiveNow(observed, watermark);
  };

  const authorizationStatus = () => PERMISSIONS[native.authorizationStatus()];

  /**
   * Re-reads what the extension recorded. A day with no monitor stays unmeasured: refreshing it
   * would turn "nobody was counting" into a measured zero.
   */
  const syncUsage = () => {
    const today = dayKey(now(), clock.timezone());
    return measuredDay(native, today) === null ? null : refreshUsage(native, today);
  };

  const publishUsage = () => {
    const minutes = syncUsage();
    usageListeners.forEach((listener) => listener(minutes));
  };

  // A window that started or ended without the app running still changes what the user sees.
  const subscription = native.onDeviceActivityMonitorEvent(() => {
    const shields = native.isShieldActive() ? 'up' : 'down';
    if (shields !== observedShields && settled) {
      observedShields = shields;
      const result: ApplyResult = { ...settled.result, shields };
      enforcementListeners.forEach((listener) => listener(result));
    }
    publishUsage();
  });

  const describeSelection = async (): Promise<LockedApps> => {
    // A handle the OS no longer resolves is an empty selection, whatever the app last stored.
    if (native.getFamilyActivitySelectionId(LOCKED_SELECTION_ID) === undefined) return EMPTY;
    const metadata = native.selectionMetadata(SELECTION);
    if (!metadata || metadata.applicationCount + metadata.categoryCount === 0) return EMPTY;
    return {
      handle: { token: LOCKED_SELECTION_ID },
      appCount: metadata.applicationCount,
      categoryCount: metadata.categoryCount,
    };
  };

  const requestAuthorization = async (): Promise<PermissionStatus> => {
    // FamilyControls throws both on "Don't Allow" and on a dead sheet, but it records the refusal
    // first, so the re-read below is the truthful outcome either way.
    if (native.authorizationStatus() === 0) await native.requestAuthorization('individual').catch(() => undefined);
    const status = authorizationStatus();
    onAuthorization?.(status);
    return status;
  };

  const registerMonitors = async (plan: MonitorPlan, open: OpenWindow, decision: LockDecision) => {
    const wanted = new Set(plan.monitors.map((monitor) => monitor.name));
    const running = native.getActivities();
    running
      .filter((name) => name.startsWith('excerlock.lock.') && !wanted.has(name))
      .forEach((stale) => native.stopMonitoring([stale]));

    for (const monitor of plan.monitors) {
      const actions = monitorActions([monitor], open, LOCKED_SELECTION_ID)[0];
      // Reconfiguring the action lists is how a met goal, a lease or a lapse reaches the OS.
      native.configureActions({ activityName: monitor.name, callbackName: 'intervalDidStart', actions: actions.atStart });
      native.configureActions({ activityName: monitor.name, callbackName: 'intervalDidEnd', actions: actions.atEnd });
      // Names are derived from the window itself, so a name already running is an unchanged window.
      if (!running.includes(monitor.name)) await native.startMonitoring(monitor.name, monitorSchedule(monitor), []);
    }

    native.stopMonitoring([LEASE_MONITOR]);
    if (decision.state === 'unlockedWalking') {
      native.configureActions({
        activityName: LEASE_MONITOR,
        callbackName: 'intervalDidEnd',
        actions: [{ type: 'blockSelection', familyActivitySelectionId: LOCKED_SELECTION_ID }],
      });
      await native.startMonitoring(LEASE_MONITOR, leaseSchedule(decision.leaseUntil, clock.timezone()), []);
    }
  };

  const currentShield = (decision: LockDecision, canNotify: boolean): { cause: ShieldCause; content: ShieldContent } => {
    // While a lease is live the only shield that can appear next is the one for its lapse.
    const cause: ShieldCause = decision.state === 'unlockedWalking' ? 'walkingEnded' : 'locked';
    return {
      cause,
      content: shieldContent({
        cause,
        hint: decision.state === 'locked' ? decision.nextUnlockHint : undefined,
        goal: decision.state === 'unlockedMet' ? 'met' : 'pending',
        canNotify,
      }),
    };
  };

  const publish = (
    decision: LockDecision,
    plan: EnforcementPlan,
    monitors: MonitorPlan,
    open: OpenWindow,
    shieldsDesired: 'up' | 'down',
  ): EnforcementFacts => {
    const { rules, ruleDays, canNotify } = copy();
    const byMonitor = shieldContentSet({ monitors: monitors.monitors, rules, ruleDays, canNotify });
    publishShieldContent(native, currentShield(decision, canNotify), byMonitor);
    return writeFacts(native, {
      shieldsDesired,
      unlockUntil: open.kind === 'until' ? open.at : null,
      leaseUntil: decision.state === 'unlockedWalking' ? decision.leaseUntil : null,
      sessionId: decision.state === 'unlockedWalking' ? decision.sessionRuleId : null,
      watermark: watermark ?? clock.now(),
      entitled: plan.monitors === 'keep',
      planHash: monitors.planHash,
      shieldContentByMonitor: byMonitor,
    });
  };

  const run = async (decision: LockDecision, plan: EnforcementPlan, monitors: MonitorPlan): Promise<ApplyResult> => {
    const open = openWindow(decision, plan);

    // B21: a lapsed entitlement clears and unregisters before anything else is considered.
    if (plan.monitors === 'unregister') {
      native.unblockSelection(SELECTION);
      native.stopMonitoring();
      publish(decision, plan, { ...monitors, monitors: [] }, open, 'down');
      return { applied: true, shields: 'down', monitors: 0 };
    }

    if (native.authorizationStatus() !== 2) return { applied: false, shields: 'down', monitors: 0, reason: 'screenTimeDenied' };
    const token = native.getFamilyActivitySelectionId(LOCKED_SELECTION_ID);
    if (token === undefined) return { applied: false, shields: 'down', monitors: 0, reason: 'noSelection' };

    // An over-budget plan cannot be armed truthfully, so the shield goes up and stays up.
    const budget = assertMonitorBudget(monitors);
    if (!budget.applied) {
      native.blockSelection(SELECTION);
      publish(decision, plan, monitors, { kind: 'none' }, 'up');
      return budget;
    }

    if (plan.shields === 'apply') native.blockSelection(SELECTION);
    try {
      await registerMonitors(monitors, open, decision);
    } catch {
      native.blockSelection(SELECTION);
      publish(decision, plan, monitors, { kind: 'none' }, 'up');
      return { applied: false, shields: 'up', monitors: monitors.monitors.length, reason: 'monitorRegistration' };
    }
    // Only now: the monitors that will raise the shield again are armed.
    if (plan.shields === 'clear') native.unblockSelection(SELECTION);

    const today = dayKey(now(), clock.timezone());
    // Measurement, never enforcement: a usage monitor that will not arm is not a failed lock.
    try {
      await armUsageMonitor(native, { day: today, timezone: clock.timezone(), familyActivitySelection: token });
    } catch {
      refreshUsage(native, today);
    }

    const shields = plan.shields === 'apply' ? 'up' : 'down';
    publish(decision, plan, monitors, open, shields);
    return { applied: true, shields, monitors: monitors.monitors.length };
  };

  return {
    authorizationStatus,
    requestAuthorization,
    describeSelection,
    measuredUsage: (day) => measuredDay(native, day),

    async presentAppPicker() {
      if (native.authorizationStatus() !== 2 && (await requestAuthorization()) !== 'granted') {
        return describeSelection();
      }
      const picked = await picker.pick(LOCKED_SELECTION_ID);
      const selection: LockedApps =
        picked && picked.applicationCount + picked.categoryCount > 0
          ? { handle: { token: LOCKED_SELECTION_ID }, appCount: picked.applicationCount, categoryCount: picked.categoryCount }
          : await describeSelection();
      onSelection?.(selection);
      return selection;
    },

    async applyLock(decision, plan, monitors) {
      const key = JSON.stringify({
        state: decision.state,
        open: openWindow(decision, plan),
        plan,
        planHash: monitors.planHash,
        selection: native.getFamilyActivitySelectionId(LOCKED_SELECTION_ID) ?? null,
      });
      if (settled?.key === key) return settled.result;
      const result = await run(decision, plan, monitors);
      // Idempotent only once it succeeded: a failed apply is never a settled state.
      settled = result.applied ? { key, result } : undefined;
      observedShields = result.shields;
      enforcementListeners.forEach((listener) => listener(result));
      publishUsage();
      return result;
    },

    observeEnforcement(callback) {
      enforcementListeners.add(callback);
      return () => void enforcementListeners.delete(callback);
    },

    observeUsage(callback) {
      usageListeners.add(callback);
      callback(syncUsage());
      return () => void usageListeners.delete(callback);
    },

    dispose() {
      subscription.remove();
      enforcementListeners.clear();
      usageListeners.clear();
    },
  };
}
