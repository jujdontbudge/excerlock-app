import type { HistoryArchive } from './sealDay';
import { historyStore } from './historyStore';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function exportHistoryAccountData(): HistoryArchive {
  return copy(historyStore.getState().data);
}

export async function importHistoryAccountData(data: HistoryArchive): Promise<void> {
  historyStore.getState().reset();
  historyStore.getState().patch(copy(data));
  await historyStore.persistBarrier();
}

export async function resetHistoryAccountData(): Promise<void> {
  historyStore.getState().reset();
  await historyStore.persistBarrier();
}
