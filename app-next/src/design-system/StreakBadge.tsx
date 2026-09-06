import { View } from 'react-native';
import { Icon } from '../icons/Icon';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
import { format } from '../content/format';
export function StreakBadge({ count }: { count: number }) {
  return (
    <Reveal>
      <View
        accessible
        accessibilityLabel={format.streak(count)}
        style={{ flexDirection: 'row', gap: t.space.xs, alignItems: 'center' }}>
        <Icon name="flame" size={t.layout.glyph} />
        <Label variant="label">{count}</Label>
      </View>
    </Reveal>
  );
}
