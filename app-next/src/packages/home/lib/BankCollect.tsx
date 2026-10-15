import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectChip } from '../../ui/CollectChip';
import { tokens as t } from '../../ui/tokens';
import { useBank, collectPoints } from '../../bank/Bank';
export function BankCollect() {
  const bank = useBank();
  const insets = useSafeAreaInsets();
  if (!bank || bank.pendingPoints <= 0) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: t.layout.tabHeight + insets.bottom + t.layout.dockFade,
        alignItems: 'center',
      }}>
      <CollectChip
        key={bank.pendingPoints}
        activity={bank.activity}
        amount={bank.pendingPoints}
        first={bank.firstCollect}
        onCollect={collectPoints}
      />
    </View>
  );
}
