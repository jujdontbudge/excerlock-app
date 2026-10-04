import { WalkingPort, WalkingStatus, inactiveWalkingStatus } from '../../../ports/WalkingPort';
import { rulesStore } from '../../../conditions/rulesStore';
import { Rule } from '../../../model/types';
import { ruleDaysStore } from '../../../conditions/ruleDaysStore';
import { FakeContext } from '../FakeContext';
import { writeWalkingProgress } from '../walkingProgress';
import { dayKey } from '../../../schedule/calendar';
import { sessionCopy as c } from '../../../enforcement/sessionsCopy';
import { settingsStore } from '../../../preferences/settingsStore';
import { createProppedState, reducePropped, proppedRelief, type ProppedState } from '../../../activity/proppedMachine';
import { createWalkingState, reduceWalking, type WalkingState } from '../../../activity/walkingMachine';
export function WalkingFake(ctx: FakeContext): WalkingPort & { resume: () => void; disconnect: () => void } {
  let cancel: (() => void) | undefined,
    activeRule: Rule | null = null,
    walkingState: WalkingState | null = null,
    status: WalkingStatus = inactiveWalkingStatus,
    detail = { steps: 0, walkingSeconds: 0 },
    lastTick = Date.parse(ctx.clock.now()),
    sessionStartedAt: string | null = null,
    base = 0;
  let propped: ProppedState = createProppedState(Date.parse(ctx.clock.now()));
  const listeners = new Set<() => void>();
  const publish = (next: WalkingStatus) => {
    status = next;
    listeners.forEach((notify) => notify());
  };
  const stopFeeds = () => {
    cancel?.();
    cancel = undefined;
  };
  const stop = () => {
    stopFeeds();
    activeRule = null;
    walkingState = null;
    propped = createProppedState(Date.parse(ctx.clock.now()));
    publish(inactiveWalkingStatus);
  };
  const walkingNow = () => ctx.snapshot().motion === 'walking';
  const evidenceFromScenario = () => {
    const script = ctx.scenario.walking;
    if (!script || !sessionStartedAt) return walkingNow() ? true : false;
    const elapsed = Math.max(0, Date.parse(ctx.clock.now()) - Date.parse(sessionStartedAt));
    return script.script[Math.min(script.script.length - 1, Math.floor(elapsed / script.stepMs))] === 'walking';
  };
  const step = () => {
    if (!activeRule || !walkingState || ctx.snapshot().loading) return;
    const now = Date.parse(ctx.clock.now());
    if (propped.phase !== 'inactive') {
      const placement = ctx.snapshot().placement ?? 'propped';
      if (placement === 'handheld' && propped.phase === 'propped')
        propped = reducePropped(propped, { kind: 'pickup', at: now }, now);
      if (placement === 'propped' && propped.phase === 'active')
        propped = reducePropped(propped, { kind: 'putDown', at: now }, now);
      if (placement === 'handheld' && walkingNow() && ['handheld', 'active'].includes(propped.phase))
        propped = reducePropped(propped, { kind: 'walkingQualified', at: now }, now);
      propped = reducePropped(propped, { kind: 'tick' }, now);
      const active = proppedRelief(propped, now);
      publish({
        ...status,
        placement,
        phase: active ? 'active' : 'inactive',
        proppedVerified: active,
        proppedEligibleUntil: active ? propped.eligibleUntil : null,
      });
      return;
    }
    if (status.proppedVerified) {
      publish({ ...status, phase: 'inactive', proppedVerified: false, proppedEligibleUntil: null });
      return;
    }
    const qualifying = evidenceFromScenario(),
      graceMs = settingsStore.getState().data.stopGrace * 1000;
    for (let at = Math.min(lastTick + 1000, now); at <= now; at += 1000)
      walkingState = reduceWalking(walkingState, { kind: 'evidence', at, qualifying }, at, graceMs);
    walkingState = reduceWalking(walkingState, { kind: 'tick' }, now, graceMs);
    const dt = Math.max(0, now - lastTick);
    lastTick = now;
    if (qualifying && walkingState.phase === 'active') {
      detail = {
        steps: detail.steps + Math.floor((dt / 1000) * 1.6),
        walkingSeconds: detail.walkingSeconds + dt / 1000,
      };
      writeWalkingProgress(
        activeRule,
        status.since ?? ctx.clock.now(),
        ctx.clock.timezone(),
        base + detail.walkingSeconds / 60,
      );
    }
    publish({
      ...status,
      ruleId: activeRule.id,
      phase: walkingState.phase,
      since: walkingState.activeSince === null ? status.since : new Date(walkingState.activeSince).toISOString(),
    });
  };
  const startFeeds = () => {
    stopFeeds();
    const stops = [ctx.clock.subscribe(step), ctx.subscribe(step)];
    cancel = () => stops.forEach((dispose) => dispose());
    step();
  };
  return {
    start: async (rule, options) => {
      if (rule.mode.kind !== 'state' || !rule.enabled)
        throw new Error('An enabled walking state condition is required');
      stop();
      activeRule = rule;
      const startedAt = ctx.clock.now(),
        now = Date.parse(startedAt),
        day = dayKey(startedAt, ctx.clock.timezone());
      sessionStartedAt = startedAt;
      base = ruleDaysStore.getState().data.days.find((d) => d.ruleId === rule.id && d.day === day)?.progress ?? 0;
      walkingState = createWalkingState(now);
      lastTick = now;
      detail = { steps: 0, walkingSeconds: 0 };
      publish({
        ...inactiveWalkingStatus,
        ruleId: rule.id,
        phase: 'verifying',
        since: startedAt,
        placement: options?.placement ?? 'handheld',
      });
      if (options?.placement === 'propped')
        propped = reducePropped(propped, { kind: 'startScan', at: now, foreground: true }, now);
      startFeeds();
      return status;
    },
    check: async (rule) => {
      if (!walkingNow()) return false;
      if (rule.mode.kind !== 'state' || !rule.enabled) return false;
      stop();
      activeRule = rule;
      const now = Date.parse(ctx.clock.now()),
        began = now - 3000;
      sessionStartedAt = new Date(began).toISOString();
      walkingState = createWalkingState(began);
      walkingState = reduceWalking(
        walkingState,
        { kind: 'evidence', at: began, qualifying: true },
        began,
        settingsStore.getState().data.stopGrace * 1000,
      );
      walkingState = reduceWalking(
        walkingState,
        { kind: 'evidence', at: now, qualifying: true },
        now,
        settingsStore.getState().data.stopGrace * 1000,
      );
      lastTick = now;
      publish({
        ...inactiveWalkingStatus,
        ruleId: rule.id,
        phase: 'active',
        since: new Date(walkingState.activeSince!).toISOString(),
        placement: 'handheld',
      });
      startFeeds();
      return true;
    },
    resume: () => {
      const rule =
        activeRule ?? rulesStore.getState().data.rules.find((candidate) => candidate.id === status.ruleId) ?? null;
      if (rule) {
        activeRule = rule;
        startFeeds();
      }
    },
    disconnect: stopFeeds,
    stop,
    completeProppedScan: () => {
      if (!activeRule || status.placement !== 'propped') return false;
      const since = ctx.clock.now(),
        now = Date.parse(since);
      propped = reducePropped(
        propped,
        { kind: 'scanPass', at: now, generation: propped.scanGeneration!, foreground: true },
        now,
      );
      if (propped.phase !== 'propped') return false;
      publish({
        ...status,
        phase: 'active',
        since,
        proppedVerified: true,
        proppedSince: since,
        proppedEligibleUntil: propped.eligibleUntil,
      });
      return true;
    },
    snapshot: () => status,
    observe: (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
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
    details: () => detail,
    treadmillFraming: () => ({
      ready: ctx.snapshot().placement !== 'handheld',
      placement: ctx.snapshot().placement ?? 'propped',
      message: c.framingBody,
    }),
  };
}
