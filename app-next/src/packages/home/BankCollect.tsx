import { CollectChip } from '../ui/CollectChip';
import { useBank, collectPoints } from '../bank/Bank';
export function BankCollect() {
  const bank = useBank();
  if (!bank || bank.pendingPoints <= 0) return null;
  return (
    <CollectChip
      key={bank.pendingPoints}
      activity={bank.activity}
      amount={bank.pendingPoints}
      first={bank.firstCollect}
      onCollect={collectPoints}
    />
  );
}
