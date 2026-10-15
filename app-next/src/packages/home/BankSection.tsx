import { View } from 'react-native';
import { Label } from '../ui';
import { BankHero } from '../ui/BankHero';
import { PointsPill } from '../ui/PointsPill';
import { tokens as t } from '../ui/tokens';
import { useBank } from '../bank/Bank';
import { bankCopy as c } from '../bank/bankCopy';
import { useShownWhileFocused } from './lib/useShownWhileFocused';
export function BankSection({ onShop }: { onShop: () => void }) {
  const bank = useBank();
  const minutes = useShownWhileFocused(bank?.bankMinutes ?? 0);
  const points = useShownWhileFocused(bank?.points ?? 0);
  if (!bank) return null;
  return (
    <View style={{ gap: t.space.xl }}>
      <BankHero minutes={minutes} />
      <View style={{ gap: t.space.md }}>
        <PointsPill activity={bank.activity} points={points} onPress={onShop} />
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {c.today(bank.today.amount, bank.today.minimum, bank.activity)}
        </Label>
      </View>
    </View>
  );
}
