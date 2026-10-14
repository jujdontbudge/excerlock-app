import type { Runtime } from '../../ports/Runtime';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { settingsStore } from '../../preferences/settingsStore';
import { permissionsStore } from '../../permissions/permissionsStore';
import { detectionStore } from '../../activity/detectionStore';
import { planBankMeasurements, projectBankEvidence } from '../../bank/BankEvidence';
import type { ExactStepMeasurement } from '../../progress/projectInstanceProgress';
export function startFakeBankEvidence(runtime: Runtime): () => void {
  let disposed = false,
    running = false,
    requested = false;
  const refresh = async () => {
    if (disposed || runtime.status.snapshot().loading || !runtime.status.snapshot().hydrated) return;
    if (running) {
      requested = true;
      return;
    }
    running = true;
    try {
      do {
        requested = false;
        if (runtime.status.snapshot().loading || !runtime.status.snapshot().hydrated) break;
        const rules = rulesStore.getState().data.rules;
        if (!rules.some((rule) => rule.enabled && rule.mode.kind === 'bank')) break;
        const now = runtime.clock.now(),
          timezone = runtime.clock.timezone();
        const steps: Record<string, ExactStepMeasurement> = {};
        if (permissionsStore.getState().data.motion === 'granted')
          for (const range of planBankMeasurements(now, timezone)) {
            const measured = await runtime.steps.metricsBetween(
              new Date(range.from).toISOString(),
              new Date(range.to + 1).toISOString(),
            );
            steps[range.key] = { from: range.from, through: range.to, steps: measured.steps, timezone };
          }
        if (
          disposed ||
          runtime.clock.now() !== now ||
          rulesStore.getState().data.rules !== rules
        ) {
          requested = true;
          continue;
        }
        if (runtime.status.snapshot().loading) break;
        const previous = ruleDaysStore.getState().data.days;
        const rows = projectBankEvidence(
          rules,
          previous,
          steps,
          detectionStore.getState().data.gym.intervals,
          settingsStore.getState().data.gymPlaces.map((place) => place.id),
          timezone,
          now,
        );
        if (JSON.stringify(rows) !== JSON.stringify(previous)) ruleDaysStore.getState().patch({ days: rows });
      } while (requested && !disposed);
    } finally {
      running = false;
    }
  };
  const request = () => {
    void refresh();
  };
  const stops = [
    runtime.steps.subscribe(request),
    runtime.clock.subscribe(request),
    runtime.status.subscribe(request),
    rulesStore.subscribe(request),
    detectionStore.subscribe(request),
    permissionsStore.subscribe(request),
  ];
  return () => {
    disposed = true;
    stops.forEach((stop) => stop());
  };
}
