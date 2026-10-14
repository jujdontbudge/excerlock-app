import { View } from 'react-native';
import { Label } from '../ui';
import { Icon } from '../ui/Icon';
import { tokens as t } from '../ui/tokens';
import { bankTrade } from './bankCopy';
import type { RuleDraft } from './draft';
export function BankConditionPreview({ activity, difficulty }: Pick<RuleDraft, 'activity' | 'difficulty'>) {
  return (
    <View
      style={{
        gap: t.space.md,
        padding: t.space.xl,
        alignItems: 'center',
        backgroundColor: t.surface.softChoice,
        borderRadius: t.radius.card,
      }}>
      <Icon name={activity} />
      <Label variant="section" style={{ textAlign: 'center' }}>
        {bankTrade(activity, difficulty)}
      </Label>
    </View>
  );
}
