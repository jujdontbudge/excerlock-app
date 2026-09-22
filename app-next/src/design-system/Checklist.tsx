import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { Icon } from '../icons/Icon';
import { Reveal } from '../motion/Reveal';
import { tokens as t } from './tokens';
export function Checklist({
  items,
  completed = 0,
  checked,
}: {
  items: readonly string[];
  completed?: number;
  checked?: readonly boolean[];
}) {
  return (
    <View style={{ gap: t.space.lg }}>
      {items.map((item, i) => (
        <Reveal key={item} index={i}>
          <View
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={item}
            accessibilityState={{ checked: checked?.[i] ?? i < completed, disabled: true }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
            }}>
            <Animated.View
              style={{
                width: t.control.indicator,
                height: t.control.indicator,
                borderRadius: t.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: (checked?.[i] ?? i < completed) ? t.swatch.mint : t.surface.subtle,
                transitionProperty: 'backgroundColor',
                transitionDuration: t.motion.duration.standard,
              }}>
              {(checked?.[i] ?? i < completed) ? (
                <Reveal>
                  <Icon name="check" variant="utility" tint={t.state.success} size={t.icon.md} />
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
