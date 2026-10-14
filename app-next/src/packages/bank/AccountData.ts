import { bankStore, type BankData } from './bankStore';
export function exportBankAccountData(): BankData {
  return JSON.parse(JSON.stringify(bankStore.getState().data)) as BankData;
}
export async function importBankAccountData(data: BankData | undefined): Promise<void> {
  bankStore.getState().reset();
  if (data) bankStore.getState().patch(data);
  await bankStore.persistBarrier();
}
export async function resetBankAccountData(): Promise<void> {
  bankStore.getState().reset();
  await bankStore.persistBarrier();
}
