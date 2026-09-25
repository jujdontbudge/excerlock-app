import { View } from 'react-native';
import { Icon } from '../Icon';
import { Label } from '../Label';
import { tokens as t } from '../tokens';
import { Reveal } from '../Reveal';
import { format } from './formatCopy';
export function StreakBadge({ count }: { count: number }) {
  return (
    <Reveal>
      <View
        accessible
        accessibilityLabel={format.streak(count)}
        style={{ flexDirection: 'row', gap: t.space.xs, alignItems: 'center' }}>
        <Icon name="flame" size={t.icon.md} />
        <Label variant="label">{count}</Label>
      </View>
    </Reveal>
  );
}
