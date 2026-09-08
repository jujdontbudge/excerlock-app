import { applyProgress } from '../../domain/progress';
import { addDays, dayKey } from '../../domain/calendar';
import { WALK_LEASE_MS, planWalkLease } from '../../domain/sessions/lease';
import {
  SessionEffect,
  WalkingSessionEvent,
  sessionWindow,
  stepWalkingSession,
} from '../../domain/sessions/walkingSession';
import { Rule, WalkingSession, WalkingSessionEndReason } from '../../domain/types';
import { windowInstances, currentInstances } from '../../domain/schedule';
import { WalkingPort, WalkingStartError } from '../../ports/WalkingPort';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { settingsStore } from '../../state/settingsStore';
import { sessionCopy as c } from '../../content/sessions';
import { FakeContext } from '../FakeContext';

type WalkingFakePort = WalkingPort & {
  resume(): void;
  disconnect(): void;
  signal(type: 'verified' | 'unverified' | 'tick'): void;
};

const minuteValue = (effect: Extract<SessionEffect, { type: 'creditMinutes' }>) =>
  Math.max(0, Date.parse(effect.to) - Date.parse(effect.from)) / 60_000;

export function WalkingFake(ctx: FakeContext): WalkingFakePort {
  let stopTick: (() => void) | undefined;
  let stopDeadlines: (() => void)[] = [];
  let scriptIndex = 0;
  let detail = { steps: 0, walkingSeconds: 0, graceUntil: null as string | null };

  const currentSession = () => ruleDaysStore.getState().data.walkingSession;
  const currentRule = (session: WalkingSession) =>
    rulesStore.getState().data.rules.find((rule) => rule.id === session.ruleId);

  const configFor = (session: WalkingSession, rule: Rule) => {
    const window = sessionWindow(session, rule, ctx.clock.now(), ctx.clock.timezone());
    if (!window) return null;
    return {
      leaseMs: WALK_LEASE_MS,
      graceMs: settingsStore.getState().data.stopGrace * 1000,
      ...window,
    };
  };

  const writeCredit = (
    rule: Rule,
    session: WalkingSession,
    effect: Extract<SessionEffect, { type: 'creditMinutes' }>,
  ) => {
    const days = ruleDaysStore.getState().data.days;
    const row = days.find((day) => day.ruleId === rule.id && day.day === session.instanceDay) ?? {
      ruleId: rule.id,
      day: session.instanceDay,
      progress: 0,
      met: false,
      metAt: null,
    };
    const next = applyProgress(rule, row, row.progress + minuteValue(effect), effect.to);
    ruleDaysStore.getState().patch({
      days: [...days.filter((day) => day.ruleId !== row.ruleId || day.day !== row.day), next],
    });

    // `HistoryDay.activity.walking` is a step count owned by the pedometer, so session minutes stay out
    // of it; the day's walking minutes live on the rule day, keyed by the instance day.
    detail = {
      ...detail,
      steps: detail.steps + Math.floor(minuteValue(effect) * 60 * 1.6),
      walkingSeconds: detail.walkingSeconds + minuteValue(effect) * 60,
    };
  };

  const disarmDeadlines = () => {
    stopDeadlines.forEach((stop) => stop());
    stopDeadlines = [];
  };

  const applyEvent = (event: WalkingSessionEvent) => {
    const session = currentSession();
    if (!session) return;
    const rule = currentRule(session);
    const config = rule ? configFor(session, rule) : null;
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
    detail = { ...detail, graceUntil: result.session.graceUntil ?? null };
    ruleDaysStore.getState().patch({ walkingSession: result.session });
    armDeadlines();
  };

  const stop = (reason: WalkingSessionEndReason = 'stopped') => {
    const session = currentSession();
    if (session && session.phase !== 'ended') applyEvent({ type: 'stop', at: ctx.clock.now(), reason });
  };

  const signal = (type: 'verified' | 'unverified' | 'tick') => {
    applyEvent({ type, at: ctx.clock.now() });
  };

  const armDeadlines = () => {
    disarmDeadlines();
    const session = currentSession();
    if (!session || session.phase === 'ended') return;
    const rule = currentRule(session);
    const config = rule ? configFor(session, rule) : null;
    if (!config) return;
    stopDeadlines = [
      ctx.clock.at(config.windowEnd, () => stop('windowEnded')),
      ctx.clock.at(config.dayEnd, () => stop('dayRollover')),
      ctx.clock.at(session.leaseUntil, () => signal('tick')),
      ctx.clock.at(new Date(Date.parse(session.leaseUntil) - 30_000).toISOString(), () => signal('tick')),
    ];
    if (session.graceUntil) stopDeadlines.push(ctx.clock.at(session.graceUntil, () => signal('tick')));
  };

  const driveScript = () => {
    const session = currentSession();
    if (!session || session.phase === 'ended') return;
    const script = ctx.scenario.walking;
    if (!script || session.placement === 'propped') {
      signal('tick');
      return;
    }
    const elapsed = Math.max(0, Date.parse(ctx.clock.now()) - Date.parse(session.startedAt));
    const nextIndex = Math.min(script.script.length - 1, Math.floor(elapsed / script.stepMs));
    while (scriptIndex < nextIndex) {
      scriptIndex++;
      const phase = script.script[scriptIndex];
      const at = new Date(Date.parse(session.startedAt) + scriptIndex * script.stepMs).toISOString();
      if (phase === 'walking') applyEvent({ type: 'verified', at });
      else if (phase === 'grace') applyEvent({ type: 'unverified', at });
      else if (phase === 'ended') applyEvent({ type: 'stop', at, reason: 'stopped' });
    }
    signal('tick');
  };

  const connect = () => {
    stopTick?.();
    stopTick = ctx.clock.subscribe(driveScript);
    armDeadlines();
  };

  const scheduledInstance = (rule: Rule) => {
    const now = ctx.clock.now();
    const active = currentInstances(rule, now, ctx.clock.timezone())[0];
    if (active) return active;
    const today = dayKey(now, ctx.clock.timezone());
    return [today, addDays(today, 1)]
      .flatMap((day) => windowInstances(rule, day, ctx.clock.timezone()))
      .filter((instance) => Date.parse(instance.start) >= Date.parse(now))
      .filter((instance) => Date.parse(instance.start) - Date.parse(now) <= WALK_LEASE_MS)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  };

  return {
    start: async (rule, options) => {
      if (rule.mode.kind !== 'state' || !rule.enabled) throw new WalkingStartError('invalidRule');
      const instance = scheduledInstance(rule);
      if (!instance) throw new WalkingStartError('notScheduled');
      stop('stopped');
      const startedAt = ctx.clock.now();
      const lease = planWalkLease(startedAt);
      const session: WalkingSession = {
        id: `${rule.id}:${startedAt}`,
        ruleId: rule.id,
        placement: options?.placement ?? 'handheld',
        instanceDay: instance.day,
        startedAt,
        verifiedAt: null,
        leaseUntil: lease.leaseUntil,
        creditedThrough: Date.parse(instance.start) > Date.parse(startedAt) ? instance.start : startedAt,
        endedAt: null,
        endReason: null,
        graceUntil: null,
        phase: 'verifying',
      };
      detail = { steps: 0, walkingSeconds: 0, graceUntil: null };
      scriptIndex = 0;
      ruleDaysStore.getState().patch({ walkingSession: session });
      connect();
      return session;
    },
    resume: () => {
      const session = currentSession();
      if (!session || session.phase === 'ended') return;
      const progress = ruleDaysStore
        .getState()
        .data.days.find((row) => row.ruleId === session.ruleId && row.day === session.instanceDay)?.progress;
      detail = {
        steps: Math.floor((progress ?? 0) * 60 * 1.6),
        walkingSeconds: (progress ?? 0) * 60,
        graceUntil: session.graceUntil ?? null,
      };
      scriptIndex = 0;
      connect();
      driveScript();
    },
    disconnect: () => {
      stopTick?.();
      stopTick = undefined;
      disarmDeadlines();
    },
    stop: (reason) => stop(reason ?? 'stopped'),
    signal,
    completeProppedScan: () => {
      const session = currentSession();
      if (!session || session.phase === 'ended') return false;
      signal('verified');
      return currentSession()?.phase === 'walking';
    },
    details: () => detail,
    observe: (callback) => {
      callback(currentSession());
      return ruleDaysStore.subscribe((state) => callback(state.data.walkingSession));
    },
    treadmillFraming: () => ({
      ready: ctx.snapshot().placement !== 'handheld',
      placement: ctx.snapshot().placement ?? 'propped',
      message: c.framingBody,
    }),
  };
}
