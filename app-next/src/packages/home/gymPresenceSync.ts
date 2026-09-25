import { AppState } from 'react-native';
import { Runtime } from '../ports/Runtime';
import { rulesStore } from '../conditions/rulesStore';
import { ruleDaysStore } from '../conditions/ruleDaysStore';
import { settingsStore } from '../preferences/settingsStore';
import { permissionsStore } from '../permissions/permissionsStore';
import { dayKey, currentInstances, windowInstances } from '../schedule/schedule';
import { PRESENCE_CONFIRM_MS, PRESENCE_EXIT_GRACE_MS, PRESENCE_RETRY_MS } from '../activity/presence';
export function startGymPresenceSync(runtime: Runtime) {
  if (runtime.kind !== 'fake') return () => undefined;
  let active = true,
    presence: 'inside' | 'outside' = 'outside',
    outsideSince: number | null = null,
    failedAt: number | null = null,
    confirming: AbortController | null = null,
    stopPresence: (() => void) | null = null;
  const now = () => Date.parse(runtime.clock.now());
  const session = () => ruleDaysStore.getState().data.gymPresence;
  const located = () => ['whenInUse', 'always'].includes(permissionsStore.getState().data.location);
  const candidate = () => {
    const at = runtime.clock.now(),
      tz = runtime.clock.timezone(),
      days = ruleDaysStore.getState().data.days;
    return rulesStore.getState().data.rules.some((rule) => {
      if (!rule.enabled || rule.activity !== 'gym') return false;
      const instance = currentInstances(rule, at, tz)[0] ?? windowInstances(rule, dayKey(at, tz), tz)[0];
      return !!instance && !days.find((d) => d.ruleId === rule.id && d.day === instance.day)?.met;
    });
  };
  const watching = () =>
    !runtime.status.snapshot().loading &&
    !!settingsStore.getState().data.gymPlaces.length &&
    (!!session() || (located() && candidate()));
  const nearest = () =>
    [...settingsStore.getState().data.gymPlaces]
      .map((place) => ({ place, distance: runtime.gym.distanceTo(place.id) }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0]?.place;
  const leave = () => {
    if (!session()) return;
    ruleDaysStore.getState().patch({ gymPresence: null });
    runtime.analytics.track('gym_presence_ended');
  };
  const confirm = async () => {
    if (!active || confirming || presence !== 'inside' || session() || !located() || !candidate()) return;
    if (failedAt !== null && now() - failedAt < PRESENCE_RETRY_MS) return;
    const place = nearest();
    if (!place) return;
    confirming = new AbortController();
    runtime.analytics.track('gym_presence_auto_started');
    try {
      await runtime.gym.checkIn(place.id, { milliseconds: PRESENCE_CONFIRM_MS, signal: confirming.signal });
      failedAt = null;
      if (active) runtime.analytics.track('gym_presence_auto_confirmed');
    } catch {
      if (presence === 'inside') failedAt = now();
    } finally {
      confirming = null;
    }
  };
  const onPresence = (value: 'inside' | 'outside') => {
    if (!active) return;
    presence = value;
    if (value === 'inside') {
      outsideSince = null;
      void confirm();
    } else {
      outsideSince = now();
      confirming?.abort();
      if (session() && !session()?.confirmedAt) leave();
    }
  };
  const reconcile = () => {
    if (!active) return;
    if (watching() && !stopPresence) stopPresence = runtime.gym.observePresence(onPresence);
    else if (!watching() && stopPresence) {
      stopPresence();
      stopPresence = null;
    }
    if (presence === 'inside') void confirm();
  };
  const tick = () => {
    if (!active) return;
    if (
      presence === 'outside' &&
      outsideSince !== null &&
      session()?.confirmedAt &&
      now() - outsideSince >= PRESENCE_EXIT_GRACE_MS
    )
      leave();
    if (presence === 'inside') void confirm();
  };
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active' && active && stopPresence) void runtime.gym.currentLocation(false).catch(() => undefined);
  });
  const stops = [
    rulesStore.subscribe(reconcile),
    settingsStore.subscribe(reconcile),
    permissionsStore.subscribe(reconcile),
    ruleDaysStore.subscribe(reconcile),
    runtime.status.subscribe(reconcile),
    runtime.clock.subscribe(tick),
  ];
  reconcile();
  return () => {
    active = false;
    confirming?.abort();
    stopPresence?.();
    appState.remove();
    stops.forEach((stop) => stop());
  };
}
