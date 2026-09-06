import { WalkingPort } from '../../ports/WalkingPort';
import { rulesStore } from '../../state/rulesStore';
import { Rule, WalkingSession } from '../../domain/types';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { FakeContext } from '../FakeContext';
import { walkedSeconds } from '../walkTiming';
import { writeWalkingProgress } from '../walkingProgress';
import { dayKey } from '../../domain/calendar';
import { sessionCopy as c } from '../../content/sessions';
export function WalkingFake(ctx: FakeContext): WalkingPort & { resume: () => void; disconnect: () => void } {
  let cancel: (() => void) | undefined,
    detail = { steps: 0, walkingSeconds: 0, graceUntil: null as string | null };
  const stop = () => {
    cancel?.();
    cancel = undefined;
    const session = ruleDaysStore.getState().data.walkingSession;
    if (session) ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'ended' } });
  };
  const play = (rule: Rule, session: WalkingSession, base: number) => {
    const startedAt = session.startedAt,
      script = ctx.scenario.walking ?? {
        script: ['verifying', 'walking', 'grace', 'ended'] as WalkingSession['phase'][],
        stepMs: 6000,
      };
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
    start: async (rule) => {
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
      play(rule, session, base);
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
    details: () => detail,
    observe: (callback) => {
      callback(ruleDaysStore.getState().data.walkingSession);
      return ruleDaysStore.subscribe((s) => callback(s.data.walkingSession));
    },
    treadmillFraming: () => ({
      ready: ctx.snapshot().placement !== 'handheld',
      placement: ctx.snapshot().placement ?? 'propped',
      message: c.framingBody,
    }),
  };
}
