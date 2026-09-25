import { settingsStore } from './settingsStore';
export function setUnits(unit: 'km' | 'mi') {
  settingsStore.getState().patch({ units: unit });
}
