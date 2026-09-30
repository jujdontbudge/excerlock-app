import type { SavedPlace } from '../model/models';
import { defaultUnits } from './profileStore';
import { settingsStore } from './settingsStore';

export type SettingsAccountData = {
  gymPlaces: SavedPlace[];
  units: 'km' | 'mi';
  stopGrace: number;
  gymAutoDetect: boolean;
};

const defaults: SettingsAccountData = {
  gymPlaces: [],
  units: defaultUnits,
  stopGrace: 30,
  gymAutoDetect: false,
};
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function exportSettingsAccountData(): SettingsAccountData {
  const { gymPlaces, units, stopGrace, gymAutoDetect } = settingsStore.getState().data;
  return copy({ gymPlaces, units, stopGrace, gymAutoDetect });
}

export async function importSettingsAccountData(data: SettingsAccountData): Promise<void> {
  settingsStore.getState().patch(copy(data));
  await settingsStore.persistBarrier();
}

export async function resetSettingsAccountData(): Promise<void> {
  settingsStore.getState().patch(defaults);
  await settingsStore.persistBarrier();
}
