import { sessionCopy } from '../../content/sessions';
import { addDays, dayKey, localInstant } from '../../domain/calendar';
import { applyProgress } from '../../domain/progress';
import { currentInstances, windowInstances } from '../../domain/schedule';
import { Rule } from '../../domain/types';
import { ClockPort } from '../../ports/ClockPort';
import { Unsubscribe } from '../../ports/models';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { settingsStore } from '../../state/settingsStore';
import {
  CadenceSample,
  LocationProvider,
  MotionProvider,
  PhonePlacementClassifierLike,
  PhonePlacementProvider,
  WalkVerdict,
  WalkVerifierLike,
} from '../engine/contracts';
import { WALK_LEASE_MS, planWalkLease } from '../pending/lease';
import { SessionEffect, WalkingSessionEvent, stepWalkingSession } from '../pending/walkingSession';
import {
  WalkingPort,
  WalkingSession,
  WalkingSessionEndReason,
  WalkingStartError,
} from '../pending/types';
import {
  PlacementEffect,
  PlacementState,
  startHandheld,
  startPlacement,
  stepPlacement,
} from './placementHandoff';

export type WalkKeepAlive = Pick<LocationProvider, 'startWalkKeepAlive' | 'stopWalkKeepAlive'>;

export type WalkingAdapterDependencies = {
  clock: ClockPort;
  motion: MotionProvider;
  location: WalkKeepAlive;
  /** `engine/signals/motion`'s `WalkVerifier`, injected so tests can drive verdicts directly. */
  createVerifier: (options: { gracePeriodMs: number }) => WalkVerifierLike;
  /** Required for a propped start; a handheld walk never touches device motion. */
  createPlacement?: () => PhonePlacementProvider;
  createClassifier?: () => PhonePlacementClassifierLike;
  rules?: () => Rule[];
  stopGraceSeconds?: () => number;
  onError?: (error: unknown) => void;
};

export type WalkingAdapter = WalkingPort & {
  /**
   * Recomputes credit through now. P2-T17 calls it on foreground so an app that was suspended for
   * ten minutes books those minutes; the high-water mark makes a repeat call free.
   */
  tick(): void;
  /** Reconnects the sensors to a session that survived a relaunch; credit is recomputed, not resumed. */
  resume(): void;
  dispose(): void;
};

const STEPS_PER_WALKING_SECOND = 1.6;

/**
 * The walking session over Core Motion.
 *
 * The adapter owns no time and no credit. It turns pedometer and camera evidence into the two
 * events P2-T15's `stepWalkingSession` understands — `verified` and `unverified` — and writes the
 * minutes that machine asks for. There is no `renew()`: a verified event renews, and a lapsed
 * lease is never revived.
 *
 * Edges, not levels. `verified` is emitted for every qualifying verdict because each one renews the
 * lease, while `unverified` is emitted only on the transition out of walking. Repeating it would
 * push the stop grace forward every time the pedometer reported a slow second.
 */
export function createWalkingAdapter({
  clock,
  motion,
  location,
  createVerifier,
  createPlacement,
  createClassifier,
  rules = () => rulesStore.getState().data.rules,
  stopGraceSeconds = () => settingsStore.getState().data.stopGrace,
  onError = () => undefined,
}: WalkingAdapterDependencies): WalkingAdapter {
  const listeners = new Set<(session: WalkingSession | null) => void>();
  let current: WalkingSession | null = null;
  let placementState: PlacementState = startPlacement(new Date(0).toISOString());
  let classifier: PhonePlacementClassifierLike | undefined;
  let placement: PhonePlacementProvider | undefined;
  let verifier: WalkVerifierLike | undefined;
  let sensors: Unsubscribe[] = [];
  let deadlines: Unsubscribe[] = [];
  let stopClock: Unsubscribe | undefined;
  let lastEmitted: 'verified' | 'unverified' | null = null;
  let cadenceOrigin: number | null = null;
  let sessionSteps = 0;

  const ruleFor = (session: WalkingSession) => rules().find((rule) => rule.id === session.ruleId);

  const configFor = (session: WalkingSession, rule: Rule) => {
    const timezone = clock.timezone();
    const instance = windowInstances(rule, session.instanceDay, timezone)[0];
    if (!instance) return null;
    const calendarMidnight = String(localInstant(addDays(dayKey(clock.now(), timezone), 1), 0, timezone));
    const instanceMidnight = String(localInstant(addDays(session.instanceDay, 1), 0, timezone));
    return {
      leaseMs: WALK_LEASE_MS,
      graceMs: stopGraceSeconds() * 1000,
      windowEnd: instance.end,
      // A window that crosses midnight belongs to its instance day until that day's own rollover.
      dayEnd: Date.parse(calendarMidnight) > Date.parse(instanceMidnight) ? calendarMidnight : instanceMidnight,
    };
  };

  const writeCredit = (rule: Rule, session: WalkingSession, effect: Extract<SessionEffect, { type: 'creditMinutes' }>) => {
    const minutes = Math.max(0, Date.parse(effect.to) - Date.parse(effect.from)) / 60_000;
    if (minutes === 0) return;
    const days = ruleDaysStore.getState().data.days;
    const row = days.find((day) => day.ruleId === rule.id && day.day === session.instanceDay) ?? {
      ruleId: rule.id,
      day: session.instanceDay,
      progress: 0,
      met: false,
      metAt: null,
      unit: 'minutes' as const,
    };
    const next = applyProgress(rule, row, row.progress + minutes, effect.to);
    ruleDaysStore.getState().patch({
      days: [...days.filter((day) => day.ruleId !== row.ruleId || day.day !== row.day), { ...next, unit: 'minutes' }],
    });
  };

  const publish = () => listeners.forEach((listener) => listener(current));

  const disarm = () => {
    deadlines.forEach((stop) => stop());
    deadlines = [];
  };

  const arm = () => {
    disarm();
    const session = current;
    if (!session || session.phase === 'ended') return;
    const rule = ruleFor(session);
    const config = rule ? configFor(session, rule) : null;
    if (!config) return;
    // Only future deadlines are armed. A deadline already in the past was handled by the event that
    // led here, and re-arming it would fire immediately and re-enter this function forever.
    const at = (deadline: string, callback: () => void) => {
      if (Date.parse(deadline) <= Date.parse(clock.now())) return;
      deadlines.push(clock.at(deadline, callback));
    };
    const tick = () => apply({ type: 'tick', at: clock.now() });
    at(config.windowEnd, () => stopWith('windowEnded'));
    at(config.dayEnd, () => stopWith('dayRollover'));
    at(session.leaseUntil, tick);
    // The lease warning P2-T09 schedules is driven by the same tick, thirty seconds early.
    at(new Date(Date.parse(session.leaseUntil) - 30_000).toISOString(), tick);
    if (session.graceUntil) at(session.graceUntil, tick);
    if (placementState.deadline) {
      at(placementState.deadline, () => onPlacement({ type: 'deadline', at: clock.now() }));
    }
  };

  const apply = (event: WalkingSessionEvent) => {
    const session = current;
    if (!session || session.phase === 'ended') return;
    const rule = ruleFor(session);
    const config = rule ? configFor(session, rule) : null;
    // A rule paused, deleted or edited out of today tears the session down where it stands.
    const result = config
      ? stepWalkingSession(session, event, config)
      : stepWalkingSession(
          session,
          { type: 'stop', at: event.at, reason: 'ruleChanged' },
          { leaseMs: WALK_LEASE_MS, graceMs: 0, windowEnd: event.at, dayEnd: event.at },
        );
    for (const effect of result.effects) {
      if (effect.type === 'creditMinutes' && rule) writeCredit(rule, session, effect);
    }
    current = result.session;
    ruleDaysStore.getState().patch({ walkingSession: current });
    if (current.phase === 'ended') teardown();
    else arm();
    publish();
  };

  const stopWith = (reason: WalkingSessionEndReason) => {
    if (current && current.phase !== 'ended') apply({ type: 'stop', at: clock.now(), reason });
  };

  const onPlacement = (event: Parameters<typeof stepPlacement>[1]) => {
    const result = stepPlacement(placementState, event);
    placementState = result.state;
    for (const effect of result.effects) applyPlacementEffect(effect);
    arm();
  };

  const applyPlacementEffect = (effect: PlacementEffect) => {
    if (effect.type === 'rescan') {
      lastEmitted = null;
      return;
    }
    if (effect.type === 'verified') {
      lastEmitted = 'verified';
      apply({ type: 'verified', at: effect.at });
      return;
    }
    if (lastEmitted !== 'verified') return;
    lastEmitted = 'unverified';
    apply({ type: 'unverified', at: effect.at });
  };

  const onVerdict = (verdict: WalkVerdict) => {
    const at = new Date(verdict.evaluatedAt).toISOString();
    if (verdict.phase === 'verified') onPlacement({ type: 'verified', at });
    else if (verdict.phase === 'notWalking') onPlacement({ type: 'unverified', at });
    // `grace` is the verifier's own hysteresis. The domain's stop grace already started on the
    // first unverified edge and is the authoritative one, so a grace verdict changes nothing.
  };

  const onCadence = (sample: CadenceSample) => {
    cadenceOrigin ??= sample.cumulativeSteps;
    sessionSteps = Math.max(0, sample.cumulativeSteps - cadenceOrigin);
    if (verifier) onVerdict(verifier.processCadence(sample));
  };

  const connect = async (mode: 'propped' | 'handheld') => {
    // The clock is the only ticker. Every notification recomputes credit from `creditedThrough`,
    // so a missed tick costs nothing and a repeated one changes nothing.
    stopClock = clock.subscribe(() => apply({ type: 'tick', at: clock.now() }));
    verifier = createVerifier({ gracePeriodMs: stopGraceSeconds() * 1000 });
    sensors = [
      motion.on('activity', (sample) => verifier && onVerdict(verifier.processActivity(sample))),
      motion.on('cadence', onCadence),
    ];
    await location.startWalkKeepAlive();
    await motion.start();
    if (mode === 'propped') {
      if (!createPlacement || !createClassifier) throw new Error('Propped walking requires a placement provider');
      placement = createPlacement();
      classifier = createClassifier();
      sensors.push(
        placement.onSample((sample) => {
          const result = classifier?.process(sample);
          if (result?.transition?.kind === 'pickedUp') {
            onPlacement({ type: 'pickedUp', at: new Date(result.transition.timestampMs).toISOString() });
          } else if (result?.transition?.kind === 'setDown') {
            onPlacement({ type: 'setDown', at: new Date(result.transition.timestampMs).toISOString() });
          }
        }),
      );
      await placement.start();
    }
  };

  const teardown = () => {
    disarm();
    stopClock?.();
    stopClock = undefined;
    sensors.splice(0).forEach((stop) => stop());
    const stopping = placement;
    verifier = undefined;
    classifier = undefined;
    placement = undefined;
    lastEmitted = null;
    cadenceOrigin = null;
    void Promise.all([
      motion.stop().catch(onError),
      stopping?.stop().catch(onError),
      location.stopWalkKeepAlive().catch(onError),
    ]);
  };

  /** Active now, or opening within one lease so the user can walk to the start line. */
  const scheduledInstance = (rule: Rule) => {
    const now = clock.now();
    const timezone = clock.timezone();
    const active = currentInstances(rule, now, timezone)[0];
    if (active) return active;
    const today = dayKey(now, timezone);
    return [today, addDays(today, 1)]
      .flatMap((day) => windowInstances(rule, day, timezone))
      .filter((instance) => Date.parse(instance.start) >= Date.parse(now))
      .filter((instance) => Date.parse(instance.start) - Date.parse(now) <= WALK_LEASE_MS)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  };

  return {
    start: async (rule, options) => {
      if (rule.mode.kind !== 'state' || !rule.enabled) throw new WalkingStartError('invalidRule');
      const instance = scheduledInstance(rule);
      if (!instance) throw new WalkingStartError('notScheduled');
      stopWith('stopped');
      const placementMode = options?.placement ?? 'handheld';
      const startedAt = clock.now();
      const session: WalkingSession = {
        id: `${rule.id}:${startedAt}`,
        ruleId: rule.id,
        placement: placementMode,
        instanceDay: instance.day,
        startedAt,
        verifiedAt: null,
        leaseUntil: planWalkLease(startedAt).leaseUntil,
        // Nothing before the window opens is walked time.
        creditedThrough: Date.parse(instance.start) > Date.parse(startedAt) ? instance.start : startedAt,
        endedAt: null,
        endReason: null,
        graceUntil: null,
        phase: 'verifying',
      };
      placementState = placementMode === 'propped' ? startPlacement(startedAt) : startHandheld(startedAt);
      sessionSteps = 0;
      cadenceOrigin = null;
      lastEmitted = null;
      current = session;
      ruleDaysStore.getState().patch({ walkingSession: session });
      try {
        await connect(placementMode);
      } catch (error) {
        teardown();
        current = null;
        ruleDaysStore.getState().patch({ walkingSession: null });
        throw error;
      }
      arm();
      publish();
      return session;
    },
    stop: () => stopWith('stopped'),
    tick: () => apply({ type: 'tick', at: clock.now() }),
    completeProppedScan: () => {
      if (!current || current.phase === 'ended') return false;
      onPlacement({ type: 'scanCompleted', at: clock.now() });
      return current.phase === 'walking';
    },
    observe: (callback) => {
      listeners.add(callback);
      callback(current);
      return () => listeners.delete(callback);
    },
    details: () => ({
      steps: sessionSteps,
      walkingSeconds: current
        ? Math.max(0, Date.parse(current.creditedThrough) - Date.parse(current.startedAt)) / 1000
        : 0,
      graceUntil: current?.graceUntil ?? null,
    }),
    treadmillFraming: () => ({
      // Ready means the phone is where the camera can watch the walker: propped and still.
      ready: placementState.phase === 'scanning' && classifier?.getResult().placement !== 'inHand',
      message: sessionCopy.framingBody,
      placement: placementState.phase === 'handheld' ? 'handheld' : 'propped',
    }),
    resume: () => {
      const session = current ?? (ruleDaysStore.getState().data.walkingSession as WalkingSession | null);
      if (!session || session.phase === 'ended') return;
      current = session;
      placementState =
        session.placement === 'propped' ? startPlacement(clock.now()) : startHandheld(clock.now());
      void connect(session.placement).then(arm).catch(onError);
      // A tick recomputes credit from `creditedThrough`, so a relaunch books the same minutes.
      apply({ type: 'tick', at: clock.now() });
    },
    dispose: () => {
      listeners.clear();
      teardown();
    },
  };
}

export const walkingStepsFromSeconds = (seconds: number) => Math.floor(seconds * STEPS_PER_WALKING_SECOND);
