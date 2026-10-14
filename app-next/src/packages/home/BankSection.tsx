import { View } from 'react-native';
import { Label, PrimaryButton, SecondaryButton } from '../ui';
import { tokens as t } from '../ui/tokens';
import { useBank, collectPoints } from '../bank/Bank';
import { bankCopy as c, bankTime } from '../bank/bankCopy';
import { haptic } from '../ui/haptics';
export function BankSection({ onShop }: { onShop: () => void }) {
  const bank = useBank();
  if (!bank) return null;
  return (
    <View style={{ gap: t.space.lg, alignItems: 'stretch' }}>
      <View
        style={{
          backgroundColor: t.surface.softChoice,
          borderRadius: t.radius.card,
          padding: t.space.xl,
          gap: t.space.md,
          alignItems: 'center',
        }}>
        <Label variant="section">{c.title}</Label>
        <Label variant="metric">{bankTime(bank.bankMinutes)}</Label>
      </View>
      <SecondaryButton label={`${bank.points.toLocaleString('en-US')} ${c.points}`} onPress={onShop} />
      {bank.pendingPoints > 0 ? (
        <PrimaryButton
          label={c.collectAmount(bank.pendingPoints)}
          onPress={() => {
            collectPoints();
            haptic('success');
          }}
        />
      ) : null}
      <Label style={{ textAlign: 'center' }}>{c.today(bank.today.amount, bank.today.minimum, bank.activity)}</Label>
    </View>
  );
}
