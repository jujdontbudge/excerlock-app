import { addDays, dayKey, localInstant } from '../../domain/calendar';
import { ClockPort } from '../../ports/ClockPort';
import { StepsPort } from '../../ports/StepsPort';
import { Unsubscribe } from '../../ports/models';
import { CadenceSample, MotionProvider } from '../engine/contracts';
import { recordMotion } from '../permissions';

export type StepsAdapterDependencies = {
  motion: MotionProvider;
  clock: ClockPort;
  /** Swallowed by default: a pedometer query that fails must not take the app down. */
  onError?: (error: unknown) => void;
};

export type StepsAdapter = StepsPort & {
  /**
   * Re-reads the day total from the local day start. P2-T17's single `AppState` handler calls this
   * on foreground; the adapter arms local midnight itself.
   */
  refresh(): Promise<number>;
  dispose(): void;
};

/**
 * Steps come from Core Motion, never HealthKit (decision B11), so they are only readable while the
 * app runs. Live cadence updates count from the moment updates started, so the day total is always
 * an anchored historical query plus the live delta since that anchor — never an accumulator.
 *
 * A DeviceActivity interval that wakes the extension cannot read the pedometer, so a goal reached
 * with the app closed is detected on the next launch. Home says so.
 */
export function createStepsAdapter({
  motion,
  clock,
  onError = () => undefined,
}: StepsAdapterDependencies): StepsAdapter {
  const listeners = new Set<(steps: number) => void>();
  let anchor = { cumulative: 0, dayTotal: 0 };
  let latestCumulative = 0;
  let total = 0;
  let stopCadence: Unsubscribe | undefined;
  let stopMidnight: Unsubscribe | undefined;
  let started = false;

  const dayStart = () => {
    const timezone = clock.timezone();
    return String(localInstant(dayKey(clock.now(), timezone), 0, timezone));
  };
  const nextMidnight = () => {
    const timezone = clock.timezone();
    return String(localInstant(addDays(dayKey(clock.now(), timezone), 1), 0, timezone));
  };

  const publish = (value: number) => {
    total = Math.max(0, Math.round(value));
    listeners.forEach((listener) => listener(total));
  };

  const stepsBetween = async (from: string, to: string) => {
    const { steps } = await motion.querySteps(Date.parse(from), Date.parse(to));
    return steps;
  };

  /** Re-anchors on the newest live reading so the delta below never counts a step twice. */
  const anchorTo = (dayTotal: number) => {
    anchor = { cumulative: latestCumulative, dayTotal };
    publish(dayTotal);
  };

  const readDayTotal = async () => {
    const at = clock.now();
    return stepsBetween(dayStart(), at);
  };

  const onCadence = (sample: CadenceSample) => {
    latestCumulative = sample.cumulativeSteps;
    publish(anchor.dayTotal + (sample.cumulativeSteps - anchor.cumulative));
  };

  const armMidnight = () => {
    stopMidnight?.();
    stopMidnight = clock.at(nextMidnight(), () => {
      // A new local day starts at zero; the live pedometer keeps counting from its own origin.
      anchorTo(0);
      armMidnight();
    });
  };

  const refresh = async () => {
    try {
      anchorTo(await readDayTotal());
    } catch (error) {
      onError(error);
    }
    return total;
  };

  const connect = async () => {
    if (started) return;
    started = true;
    try {
      // Order matters: measure the day up to the instant live updates begin, so the delta the
      // pedometer reports afterwards cannot overlap the historical query.
      const startingAt = clock.now();
      await motion.start();
      stopCadence = motion.on('cadence', onCadence);
      armMidnight();
      anchorTo(await stepsBetween(dayStart(), startingAt));
    } catch (error) {
      onError(error);
    }
  };

  const disconnect = () => {
    if (!started) return;
    started = false;
    stopCadence?.();
    stopCadence = undefined;
    stopMidnight?.();
    stopMidnight = undefined;
    void motion.stop().catch(onError);
  };

  return {
    authorizationStatus: () => recordMotion(motion.getAuthorizationStatus()),
    request: async () => recordMotion(await motion.requestAuthorization()),
    stepsSince: (start) => stepsBetween(start, clock.now()),
    subscribe: (callback) => {
      listeners.add(callback);
      callback(total);
      void connect();
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0) disconnect();
      };
    },
    refresh,
    dispose: () => {
      listeners.clear();
      disconnect();
    },
  };
}
