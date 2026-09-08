import { addDays, localInstant } from '../domain/calendar';
import { currentInstances, dayKey, windowInstances } from '../domain/schedule';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { Unsubscribe } from '../ports/models';
import { Runtime } from './Runtime';

type StopReason = 'windowEnded' | 'dayRollover' | 'ruleChanged';

// merge: replace this adapter with P2-T15's walking session stop event.
function stopSession(runtime: Runtime, _reason: StopReason) {
  runtime.walking.stop();
}

export function startSessionGuard(runtime: Runtime): Unsubscribe {
  let deadlineStops: Unsubscribe[] = [];
  let guardedRule = '';
  let stopped = false;
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
    const rule = rulesStore.getState().data.rules.find((candidate) => candidate.id === session.ruleId);
    if (!rule || !rule.enabled) {
      if (!stopped) stopSession(runtime, 'ruleChanged');
      stopped = true;
      return;
    }
    const signature = JSON.stringify({ id: rule.id, updatedAt: rule.updatedAt, schedule: rule.schedule, mode: rule.mode });
    if (guardedRule && guardedRule !== signature) {
      if (!stopped) stopSession(runtime, 'ruleChanged');
      stopped = true;
      return;
    }
    guardedRule = signature;
    stopped = false;
    const timezone = runtime.clock.timezone();
    const instance =
      currentInstances(rule, runtime.clock.now(), timezone)[0] ??
      windowInstances(rule, dayKey(session.startedAt, timezone), timezone)[0];
    if (!instance) {
      stopSession(runtime, 'ruleChanged');
      stopped = true;
      return;
    }
    const stopOnce = (reason: StopReason) => {
      if (stopped) return;
      stopped = true;
      stopSession(runtime, reason);
    };
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
