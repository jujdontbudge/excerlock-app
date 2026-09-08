import { sessionWindow } from '../domain/sessions/walkingSession';
import { WalkingSessionEndReason } from '../domain/types';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { Unsubscribe } from '../ports/models';
import { Runtime } from './Runtime';

type GuardReason = Extract<WalkingSessionEndReason, 'windowEnded' | 'dayRollover' | 'ruleChanged'>;

/**
 * Arms a live walking session's two teardown deadlines at the root, and ends the session when the
 * rule behind it is paused, deleted or rescheduled out of the day it is running in. The reason is
 * the session machine's input, so it credits through the instant that reason names rather than
 * through the moment the guard happened to notice.
 */
export function startSessionGuard(runtime: Runtime): Unsubscribe {
  let deadlineStops: Unsubscribe[] = [];
  let guardedSession = '';
  let guardedRule = '';
  let stopped = false;
  const clearDeadlines = () => {
    deadlineStops.forEach((stop) => stop());
    deadlineStops = [];
  };
  const stopOnce = (reason: GuardReason) => {
    if (stopped) return;
    stopped = true;
    runtime.walking.stop(reason);
  };
  const rearm = () => {
    clearDeadlines();
    const session = ruleDaysStore.getState().data.walkingSession;
    if (!session || session.phase === 'ended') {
      guardedSession = '';
      guardedRule = '';
      stopped = false;
      return;
    }
    // The latch clears only for a new session. A stop credits and writes as it unwinds, and those
    // writes re-enter here while the session is still live; re-arming then would stop it twice.
    if (session.id !== guardedSession) {
      guardedSession = session.id;
      guardedRule = '';
      stopped = false;
    }
    if (stopped) return;
    const rule = rulesStore.getState().data.rules.find((candidate) => candidate.id === session.ruleId);
    if (!rule || !rule.enabled) return stopOnce('ruleChanged');
    const signature = JSON.stringify({
      id: rule.id,
      updatedAt: rule.updatedAt,
      schedule: rule.schedule,
      mode: rule.mode,
    });
    if (guardedRule && guardedRule !== signature) return stopOnce('ruleChanged');
    guardedRule = signature;
    const window = sessionWindow(session, rule, runtime.clock.now(), runtime.clock.timezone());
    if (!window) return stopOnce('ruleChanged');
    deadlineStops = [
      runtime.clock.at(window.windowEnd, () => stopOnce('windowEnded')),
      runtime.clock.at(window.dayEnd, () => stopOnce('dayRollover')),
    ];
  };
  rearm();
  const storeStops = [rulesStore.subscribe(rearm), ruleDaysStore.subscribe(rearm)];
  return () => {
    clearDeadlines();
    storeStops.forEach((stop) => stop());
  };
}
