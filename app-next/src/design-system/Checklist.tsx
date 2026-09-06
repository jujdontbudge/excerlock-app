import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { Icon } from '../icons/Icon';
import { Reveal } from '../motion/Reveal';
import { tokens as t } from './tokens';
export function Checklist({ items, completed }: { items: readonly string[]; completed: number }) {
  return (
    <View style={{ gap: t.space.lg }}>
      {items.map((item, i) => (
        <Reveal key={item} index={i}>
          <View
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={item}
            accessibilityState={{ checked: i < completed, disabled: true }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
            }}>
            <Animated.View
              style={{
                width: t.layout.disc,
                height: t.layout.disc,
                borderRadius: t.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: i < completed ? t.icon.mint : t.surface.subtle,
                transitionProperty: 'backgroundColor',
                transitionDuration: t.motion.duration.standard,
              }}>
              {i < completed ? (
                <Reveal>
                  <Icon name="check" variant="utility" tint={t.state.success} size={t.layout.glyph} />
                </Reveal>
              ) : (
                <Label variant="support" tone="secondary">
                  {i + 1}
                </Label>
              )}
            </Animated.View>
            <Label style={{ flex: 1 }}>{item}</Label>
          </View>
        </Reveal>
      ))}
    </View>
  );
}
