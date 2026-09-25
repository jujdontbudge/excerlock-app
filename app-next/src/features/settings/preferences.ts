import { settingsStore } from '../../state/settingsStore';
export function setUnits(unit: 'km' | 'mi') {
  settingsStore.getState().patch({ units: unit });
}
