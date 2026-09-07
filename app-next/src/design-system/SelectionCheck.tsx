import { View } from 'react-native';
import { Icon } from '../icons/Icon';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
/** White badge and orange check remain legible against a solid selected surface. */
export function SelectionCheck({ size = t.layout.glyph }: { size?: number }) {
  return (
    <Reveal>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: t.radius.pill,
          backgroundColor: t.text.onAccent,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="check" variant="utility" size={t.space.lg} tint={t.brand.primary} />
      </View>
    </Reveal>
  );
}
