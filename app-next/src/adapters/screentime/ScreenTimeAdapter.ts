import { dayKey } from '../../domain/calendar';
import { EnforcementPlan } from '../../domain/enforcement';
import { assertMonitorBudget, MonitorPlan } from '../../domain/monitorPlan';
import { ShieldCause, shieldContent, ShieldContent, shieldContentSet } from '../../domain/shieldContent';
import { LockDecision, LockedApps, PermissionStatus, Rule, RuleDay } from '../../domain/types';
import { effectiveNow, nextWatermark } from '../../domain/watermark';
import { NATIVE_LOCKED_SELECTION } from '../../engine/screentime/native/nativeSelection';
import {
  DeviceActivityApi,
  DeviceActivityAuthorizationStatus,
} from '../../engine/screentime/native/deviceActivityTypes';
import { ScreenTimeModule } from '../../engine/screentime/ScreenTimeModule';
import { ApplyResult, ScreenTimePort } from '../../ports/ScreenTimePort';
import { openWindow, OpenWindow, startIntents } from './actions';
import { EnforcementFacts, writeFacts } from './appGroup';
import { publishShieldContent } from './shieldPublisher';
import { armUsageMonitor, measuredDay, refreshUsage, stopUsageMonitor } from './usage';

/** What the shield says. The domain owns the strings; the adapter only needs the inputs. */
export type ShieldCopySource = () => { rules: Rule[]; ruleDays: RuleDay[]; canNotify: boolean };

export type ScreenTimeAdapterDeps = {
  /**
   * The ported native edge: authorization, the system picker, shields and the lock-window
   * monitors. Compose it with the runtime clock as its `nowMs`, so the shield state it derives
   * and the decision this adapter applies are read from the same clock.
   */
  module: ScreenTimeModule;
  /**
   * The same DeviceActivity the module holds. The adapter needs it for the two things the module
   * deliberately does not own: the app-group facts and the Analytics usage monitor (B15).
   */
  deviceActivity: DeviceActivityApi;
  clock: { now(): string; timezone(): string };
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
const SELECTION = { activitySelectionId: NATIVE_LOCKED_SELECTION };

/**
 * `resolveLock` decides; this applies. Every branch below either raises the shield or leaves it
 * raised, so no failure can be the reason a user's apps opened.
 */
export function createScreenTimeAdapter({
  module,
  deviceActivity,
  clock,
  copy,
  onSelection,
  onAuthorization,
}: ScreenTimeAdapterDeps): ScreenTimeAdapter {
  const enforcementListeners = new Set<(result: ApplyResult) => void>();
  const usageListeners = new Set<(minutes: number | null) => void>();
  let settled: { key: string; result: ApplyResult } | undefined;
  let watermark: string | null = null;
  let applying = false;

  const now = () => {
    const observed = clock.now();
    watermark = nextWatermark(observed, watermark);
    return effectiveNow(observed, watermark);
  };

  // The port reads authorization synchronously; the module's own read is the same call behind a
  // rehydration await, which the status does not depend on.
  const authorizationStatus = () => PERMISSIONS[deviceActivity.authorizationStatus()];

  /**
   * Re-reads what the extension recorded. A day with no monitor stays unmeasured: refreshing it
   * would turn "nobody was counting" into a measured zero.
   */
  const syncUsage = () => {
    const today = dayKey(now(), clock.timezone());
    return measuredDay(deviceActivity, today) === null ? null : refreshUsage(deviceActivity, today);
  };

  const publishUsage = () => {
    const minutes = syncUsage();
    usageListeners.forEach((listener) => listener(minutes));
  };

  // A window that started or ended without the app running still changes what the user sees.
  const stopShieldState = module.subscribe((state) => {
    // An apply in flight reports its own outcome; this is only for a change the app did not make.
    if (applying || !settled || state.effectiveShields === settled.result.shields) return;
    const result: ApplyResult = { ...settled.result, shields: state.effectiveShields };
    settled = { ...settled, result };
    enforcementListeners.forEach((listener) => listener(result));
  });
  // Threshold events never move the shield, so usage needs its own ear on the extension.
  const usageSubscription = deviceActivity.onDeviceActivityMonitorEvent(() => publishUsage());

  const describeSelection = async (): Promise<LockedApps> => {
    // Two ways a selection stops existing: this app forgot the handle, or the OS no longer
    // resolves it. Either one is an empty selection, whatever counts were last stored.
    if (deviceActivity.getFamilyActivitySelectionId(NATIVE_LOCKED_SELECTION) === undefined) return EMPTY;
    const summary = await module.describeSelection(NATIVE_LOCKED_SELECTION);
    if (!summary || summary.applicationCount + summary.categoryCount === 0) return EMPTY;
    return {
      handle: { token: summary.handle },
      appCount: summary.applicationCount,
      categoryCount: summary.categoryCount,
    };
  };

  const requestAuthorization = async (): Promise<PermissionStatus> => {
    await module.requestAuthorization();
    const status = authorizationStatus();
    onAuthorization?.(status);
    return status;
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
    publishShieldContent(deviceActivity, currentShield(decision, canNotify), byMonitor);
    return writeFacts(deviceActivity, {
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

  const observedShields = async (): Promise<'up' | 'down'> => (await module.getCurrentShieldState()).effectiveShields;

  const run = async (decision: LockDecision, plan: EnforcementPlan, monitors: MonitorPlan): Promise<ApplyResult> => {
    const open = openWindow(decision, plan);
    const handle = NATIVE_LOCKED_SELECTION;
    const empty: MonitorPlan = { ...monitors, monitors: [] };

    // B21: a lapsed entitlement clears and unregisters before anything else is considered.
    if (plan.monitors === 'unregister') {
      try {
        await module.reconcile(handle, 'down', empty);
        await module.stopUnlockLease();
      } catch {
        // No selection was ever issued, so there is nothing registered to retire.
        deviceActivity.unblockSelection(SELECTION);
      }
      stopUsageMonitor(deviceActivity);
      publish(decision, plan, empty, open, 'down');
      return { applied: true, shields: 'down', monitors: 0 };
    }

    if (deviceActivity.authorizationStatus() !== 2) {
      return { applied: false, shields: 'down', monitors: 0, reason: 'screenTimeDenied' };
    }
    const selection = await describeSelection();
    if (selection.handle === null) return { applied: false, shields: 'down', monitors: 0, reason: 'noSelection' };

    // An over-budget plan cannot be armed truthfully, so the shield goes up and stays up.
    const budget = assertMonitorBudget(monitors);
    if (!budget.applied) {
      deviceActivity.blockSelection(SELECTION);
      publish(decision, plan, monitors, { kind: 'none' }, 'up');
      return budget;
    }

    const shields = plan.shields === 'apply' ? 'up' : 'down';
    try {
      // One re-arm routine: a rule edit, midnight, a timezone change, an entitlement transition
      // and a lease renewal all arrive here. The per-monitor intents carry the met/lease decision.
      await module.reconcile(handle, shields, monitors, startIntents(monitors.monitors, open));
      if (decision.state === 'unlockedWalking') {
        await module.armUnlockLease(handle, Date.parse(decision.leaseUntil));
      } else {
        await module.stopUnlockLease();
      }
    } catch {
      deviceActivity.blockSelection(SELECTION);
      publish(decision, plan, monitors, { kind: 'none' }, 'up');
      return { applied: false, shields: 'up', monitors: monitors.monitors.length, reason: 'monitorRegistration' };
    }

    const today = dayKey(now(), clock.timezone());
    try {
      await armUsageMonitor(deviceActivity, {
        day: today,
        timezone: clock.timezone(),
        familyActivitySelection: deviceActivity.getFamilyActivitySelectionId(handle)!,
      });
    } catch {
      // Measurement, never enforcement: a usage monitor that will not arm is not a failed lock, and
      // the day it would have covered stays unmeasured rather than becoming a measured zero.
    }

    publish(decision, plan, monitors, open, shields);
    // The engine keeps shields down outside every window, so report what the OS is doing, not what
    // was asked for.
    return { applied: true, shields: await observedShields(), monitors: monitors.monitors.length };
  };

  return {
    authorizationStatus,
    requestAuthorization,
    describeSelection,
    measuredUsage: (day) => measuredDay(deviceActivity, day),

    async presentAppPicker() {
      if (deviceActivity.authorizationStatus() !== 2 && (await requestAuthorization()) !== 'granted') {
        return describeSelection();
      }
      // The module persists what the user chose, so the summary below is the answer either way:
      // a cancelled sheet leaves the previous selection exactly as it was.
      await module.pickSelection();
      const selection = await describeSelection();
      onSelection?.(selection);
      return selection;
    },

    async applyLock(decision, plan, monitors) {
      const key = JSON.stringify({
        state: decision.state,
        open: openWindow(decision, plan),
        plan,
        planHash: monitors.planHash,
        selection: deviceActivity.getFamilyActivitySelectionId(NATIVE_LOCKED_SELECTION) ?? null,
      });
      if (settled?.key === key) return settled.result;
      applying = true;
      const result = await run(decision, plan, monitors).finally(() => {
        applying = false;
      });
      // Idempotent only once it succeeded: a failed apply is never a settled state.
      settled = result.applied ? { key, result } : undefined;
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
      stopShieldState();
      usageSubscription.remove();
      enforcementListeners.clear();
      usageListeners.clear();
    },
  };
}
