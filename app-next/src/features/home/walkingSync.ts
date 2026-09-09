import { Runtime } from '../../runtime/Runtime';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { permissionsStore } from '../../state/permissionsStore';
import { dayKey, currentInstances, windowInstances } from '../../domain/schedule';
/**
 * App-level Walk & Scroll engine. When the motion signal reads as walking and a walking-state condition can earn
 * today, it starts the same verified session the "I'm walking" button starts; the session itself decides when the
 * cadence has held long enough to unlock and when it has stopped. A session the user ended is only replaced after
 * walking stops and starts again, so a manual Stop is respected.
 */
export function startWalkingSync(runtime: Runtime) {
  let active = true,
    walking = false,
    starting = false;
  const candidate = () => {
    const now = runtime.clock.now(),
      tz = runtime.clock.timezone();
    return rulesStore
      .getState()
      .data.rules.find(
        (rule) =>
          rule.enabled &&
          rule.mode.kind === 'state' &&
          !!(currentInstances(rule, now, tz)[0] ?? windowInstances(rule, dayKey(now, tz), tz)[0]),
      );
  };
  const consider = async (edge = false) => {
    if (!active || starting || !walking || runtime.dev.snapshot().loading) return;
    if (permissionsStore.getState().data.motion !== 'granted') return;
    const session = ruleDaysStore.getState().data.walkingSession;
    if (session && (session.phase !== 'ended' || !edge)) return;
    const rule = candidate();
    if (!rule) return;
    starting = true;
    try {
      await runtime.walking.start(rule);
      runtime.analytics.track('walk_auto_started');
    } catch {
      // A disabled rule or a runtime refusal simply leaves the manual button as the route.
    } finally {
      starting = false;
    }
  };
  const stops = [
    runtime.walking.observeWalking((value) => {
      const rising = value && !walking;
      walking = value;
      void consider(rising);
    }),
    rulesStore.subscribe(() => void consider()),
    permissionsStore.subscribe(() => void consider()),
    runtime.dev.subscribe(() => void consider()),
  ];
  return () => {
    active = false;
    stops.forEach((stop) => stop());
  };
}
