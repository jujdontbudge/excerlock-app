import { WalkingPort } from '../../ports/WalkingPort';
import { rulesStore } from '../../state/rulesStore';
import { Rule, WalkingSession } from '../../domain/types';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { FakeContext } from '../FakeContext';
import { walkedSeconds } from '../walkTiming';
import { writeWalkingProgress } from '../walkingProgress';
import { dayKey } from '../../domain/calendar';
import { sessionCopy as c } from '../../content/sessions';
import { settingsStore } from '../../state/settingsStore';
import { WALK_VERIFY_MS, WALK_LEASE_MS } from '../../domain/walking';
export function WalkingFake(ctx: FakeContext): WalkingPort & { resume: () => void; disconnect: () => void } {
  let cancel: (() => void) | undefined,
    detail = { steps: 0, walkingSeconds: 0, graceUntil: null as string | null };
  const stop = () => {
    cancel?.();
    cancel = undefined;
    const session = ruleDaysStore.getState().data.walkingSession;
    if (session) ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'ended' } });
  };
  const walkingNow = () => ctx.snapshot().motion === 'walking';
  /** Signal-driven session: cadence must hold for WALK_VERIFY_MS, then keeps the lease renewed until it stops. */
  const verify = (rule: Rule, session: WalkingSession, base: number) => {
    const startedAt = session.startedAt;
    let phase = session.phase,
      lease = session.leaseUntil,
      graceUntil: string | null = null,
      walkingSince: number | null = null,
      seconds = 0,
      lastTick = Date.parse(ctx.clock.now());
    const step = () => {
      const s = ctx.snapshot();
      if (s.loading) return;
      const now = ctx.clock.now(),
        t = Date.parse(now),
        walking = walkingNow(),
        dt = Math.max(0, t - lastTick),
        before = `${phase}:${lease}`;
      lastTick = t;
      if (phase === 'verifying') {
        if (!walking) walkingSince = null;
        else {
          walkingSince ??= t;
          if (t - walkingSince >= WALK_VERIFY_MS) {
            phase = 'walking';
            lease = new Date(t + WALK_LEASE_MS).toISOString();
          }
        }
      } else if (phase === 'walking') {
        if (walking) {
          seconds += dt / 1000;
          lease = new Date(t + WALK_LEASE_MS).toISOString();
        } else {
          phase = 'grace';
          graceUntil = new Date(t + settingsStore.getState().data.stopGrace * 1000).toISOString();
        }
      } else if (phase === 'grace') {
        if (walking) {
          phase = 'walking';
          graceUntil = null;
        } else if (graceUntil && t >= Date.parse(graceUntil)) phase = 'ended';
      }
      detail = { steps: Math.floor(seconds * 1.6), walkingSeconds: seconds, graceUntil: phase === 'grace' ? graceUntil : null };
      if (dt) writeWalkingProgress(rule, startedAt, ctx.clock.timezone(), base + seconds / 60);
      if (before !== `${phase}:${lease}`) ruleDaysStore.getState().patch({ walkingSession: { ...session, phase, leaseUntil: lease } });
      if (phase === 'ended') {
        cancel?.();
        cancel = undefined;
      }
    };
    const stops = [ctx.clock.subscribe(step), ctx.subscribe(step)];
    cancel = () => stops.forEach((stop) => stop());
    step();
  };
  const play = (rule: Rule, session: WalkingSession, base: number) => {
    if (!ctx.scenario.walking) return verify(rule, session, base);
    const startedAt = session.startedAt,
      script = ctx.scenario.walking;
    cancel = ctx.clock.subscribe(() => {
      const elapsed = Math.max(0, Date.parse(ctx.clock.now()) - Date.parse(startedAt)),
        index = Math.min(script.script.length - 1, Math.floor(elapsed / script.stepMs)),
        phase = elapsed >= 900000 ? 'ended' : script.script[index],
        seconds = walkedSeconds(script.script, script.stepMs, Math.min(elapsed, 900000));
      detail = {
        steps: Math.floor(seconds * 1.6),
        walkingSeconds: seconds,
        graceUntil:
          phase === 'grace' ? new Date(Date.parse(startedAt) + (index + 1) * script.stepMs).toISOString() : null,
      };
      writeWalkingProgress(rule, startedAt, ctx.clock.timezone(), base + seconds / 60);
      ruleDaysStore.getState().patch({ walkingSession: { ...session, phase } });
      if (phase === 'ended') {
        cancel?.();
        cancel = undefined;
      }
    });
  };
  return {
    start: async (rule, options) => {
      if (rule.mode.kind !== 'state' || !rule.enabled)
        throw new Error('An enabled walking state condition is required');
      stop();
      const startedAt = ctx.clock.now(),
        day = dayKey(startedAt, ctx.clock.timezone()),
        base = ruleDaysStore.getState().data.days.find((d) => d.ruleId === rule.id && d.day === day)?.progress ?? 0,
        session: WalkingSession = {
          ruleId: rule.id,
          startedAt,
          leaseUntil: new Date(Date.parse(startedAt) + 900000).toISOString(),
          phase: 'verifying',
        };
      detail = { steps: 0, walkingSeconds: 0, graceUntil: null };
      ruleDaysStore.getState().patch({ walkingSession: session });
      if (options?.placement !== 'propped') play(rule, session, base);
      return session;
    },
    resume: () => {
      cancel?.();
      const session = ruleDaysStore.getState().data.walkingSession,
        rule = rulesStore.getState().data.rules.find((r) => r.id === session?.ruleId);
      if (!session || !rule || session.phase === 'ended') return;
      const script = ctx.scenario.walking,
        elapsed = Date.parse(ctx.clock.now()) - Date.parse(session.startedAt),
        seconds = script ? walkedSeconds(script.script, script.stepMs, elapsed) : 0,
        day = dayKey(session.startedAt, ctx.clock.timezone()),
        progress = ruleDaysStore.getState().data.days.find((d) => d.ruleId === rule.id && d.day === day)?.progress ?? 0;
      play(rule, session, Math.max(0, progress - seconds / 60));
    },
    disconnect: () => {
      cancel?.();
      cancel = undefined;
    },
    stop,
    completeProppedScan: () => {
      const session = ruleDaysStore.getState().data.walkingSession;
      if (!session || session.phase === 'ended') return false;
      cancel?.();
      const leaseUntil = new Date(Date.parse(ctx.clock.now()) + 900000).toISOString();
      ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'walking', leaseUntil } });
      cancel = ctx.clock.subscribe(() => { if (ctx.clock.now() >= leaseUntil) stop(); });
      return true;
    },
    details: () => detail,
    observe: (callback) => {
      callback(ruleDaysStore.getState().data.walkingSession);
      return ruleDaysStore.subscribe((s) => callback(s.data.walkingSession));
    },
    observeWalking: (callback) => {
      let last = walkingNow();
      callback(last);
      return ctx.subscribe(() => {
        const next = walkingNow();
        if (next !== last) {
          last = next;
          callback(next);
        }
      });
    },
    treadmillFraming: () => ({
      ready: ctx.snapshot().placement !== 'handheld',
      placement: ctx.snapshot().placement ?? 'propped',
      message: c.framingBody,
    }),
  };
}
