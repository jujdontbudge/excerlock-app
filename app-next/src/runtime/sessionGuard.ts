import { addDays, localInstant } from '../domain/calendar';
import { currentInstances, dayKey, windowInstances } from '../domain/schedule';
import { WalkingSessionEndReason } from '../domain/types';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { Unsubscribe } from '../ports/models';
import { Runtime } from './Runtime';

/** The three reasons the root — not a screen — ends a walking session. */
type StopReason = Extract<WalkingSessionEndReason, 'windowEnded' | 'dayRollover' | 'ruleChanged'>;

export function startSessionGuard(runtime: Runtime): Unsubscribe {
  let deadlineStops: Unsubscribe[] = [];
  let guardedRule = '';
  // The session this guard has already torn down. Every rule-day write re-runs the guard and the port
  // may take a moment to end the session, so identity is what keeps one teardown from firing twice.
  let stoppedSession = '';
  const clearDeadlines = () => {
    deadlineStops.forEach((stop) => stop());
    deadlineStops = [];
  };
  const rearm = () => {
    clearDeadlines();
    const session = ruleDaysStore.getState().data.walkingSession;
    if (!session || session.phase === 'ended') {
      guardedRule = '';
      return;
    }
    if (session.id === stoppedSession) return;
    const stopOnce = (reason: StopReason) => {
      if (session.id === stoppedSession) return;
      stoppedSession = session.id;
      runtime.walking.stop(reason);
    };
    const rule = rulesStore.getState().data.rules.find((candidate) => candidate.id === session.ruleId);
    if (!rule || !rule.enabled) {
      stopOnce('ruleChanged');
      return;
    }
    const signature = JSON.stringify({ id: rule.id, updatedAt: rule.updatedAt, schedule: rule.schedule, mode: rule.mode });
    if (guardedRule && guardedRule !== signature) {
      stopOnce('ruleChanged');
      return;
    }
    guardedRule = signature;
    const timezone = runtime.clock.timezone();
    const instance =
      currentInstances(rule, runtime.clock.now(), timezone)[0] ??
      windowInstances(rule, dayKey(session.startedAt, timezone), timezone)[0];
    if (!instance) {
      stopOnce('ruleChanged');
      return;
    }
    deadlineStops = [
      runtime.clock.at(instance.end, () => stopOnce('windowEnded')),
      runtime.clock.at(localInstant(addDays(instance.day, 1), 0, timezone), () => stopOnce('dayRollover')),
    ];
  };
  rearm();
  const storeStops = [rulesStore.subscribe(rearm), ruleDaysStore.subscribe(rearm)];
  return () => {
    clearDeadlines();
    storeStops.forEach((stop) => stop());
  };
}
