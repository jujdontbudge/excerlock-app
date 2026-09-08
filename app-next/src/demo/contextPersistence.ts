import AsyncStorage from '@react-native-async-storage/async-storage';
import { FakeContext } from './FakeContext';
import { scenarios } from './scenarios';
import { DevSnapshot } from '../ports/RuntimeControls';
const key = 'excerlock-next.fake-context.v1';
/** Adapter metadata, separate from the eight product stores; never resets product edits. */
export function contextPersistence(ctx: FakeContext) {
  let writing = Promise.resolve(),
    stops: (() => void)[] = [],
    disposed = false;
  const save = () => {
    const s = ctx.snapshot();
    if (s.loading || !s.hydrated || disposed) return;
    const value = JSON.stringify({
      scenarioId: s.scenarioId,
      now: ctx.clock.now(),
      timezone: ctx.clock.timezone(),
      stepsOverride: s.stepsOverride,
      promptMode: s.promptMode,
      outcome: s.outcome,
      restoreOutcome: s.restoreOutcome,
      presence: s.presence,
      placement: s.placement,
    });
    writing = writing.then(() => AsyncStorage.setItem(key, value)).catch(() => undefined);
  };
  const ready = (async () => {
    try {
      const raw = await AsyncStorage.getItem(key),
        data = raw ? JSON.parse(raw) : null;
      const scenario = scenarios.find((s) => s.id === data?.scenarioId);
      if (scenario && Number.isFinite(Date.parse(data.now)) && typeof data.timezone === 'string') {
        new Intl.DateTimeFormat('en-US', { timeZone: data.timezone });
        ctx.scenario = scenario;
        ctx.clock.set(data.now, data.timezone);
        const patch: Partial<DevSnapshot> = {
          scenarioId: scenario.id,
          accessibility: scenario.accessibility,
        };
        if (['ask', 'grant', 'deny'].includes(data.promptMode)) patch.promptMode = data.promptMode;
        if (['success', 'cancel', 'error'].includes(data.outcome)) patch.outcome = data.outcome;
        if (['restored', 'notFound'].includes(data.restoreOutcome)) patch.restoreOutcome = data.restoreOutcome;
        if (['inside', 'outside'].includes(data.presence)) patch.presence = data.presence;
        if (['propped', 'handheld'].includes(data.placement)) patch.placement = data.placement;
        const steps = data.stepsOverride;
        if (
          steps &&
          Number.isFinite(steps.value) &&
          steps.value >= 0 &&
          typeof steps.day === 'string' &&
          Number.isFinite(Date.parse(steps.at))
        )
          patch.stepsOverride = steps;
        ctx.update(patch);
      }
    } catch {
      /* Invalid or unavailable adapter metadata must not prevent local launch. */
    }
    ctx.update({ hydrated: true });
    if (!disposed) stops = [ctx.subscribe(save), ctx.clock.observe(save)];
  })();
  return {
    ready,
    flush: async () => {
      await ready;
      save();
      await writing;
    },
    dispose: () => {
      save();
      disposed = true;
      stops.forEach((stop) => stop());
    },
  };
}
