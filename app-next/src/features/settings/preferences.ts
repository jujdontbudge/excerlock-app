import { settingsStore } from '../../state/settingsStore';
/** Step and minute goals are unit-free, so switching units always succeeds. Distance
    rules (and their range guard) were removed with running/biking; the units preference
    stays so a future activity can reuse it without a data migration. */
export function setUnits(unit: 'km' | 'mi') {
  settingsStore.getState().patch({ units: unit });
}
