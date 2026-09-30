import type { Profile } from '../model/types';
import { profileStore } from './profileStore';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function exportProfileAccountData(): Profile {
  return copy(profileStore.getState().data);
}

export async function importProfileAccountData(data: Profile): Promise<void> {
  profileStore.getState().reset();
  profileStore.getState().patch(copy(data));
  await profileStore.persistBarrier();
}

export async function resetProfileAccountData(): Promise<void> {
  profileStore.getState().reset();
  await profileStore.persistBarrier();
}
