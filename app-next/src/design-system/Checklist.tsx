import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { Icon } from '../icons/Icon';
import { Reveal } from '../motion/Reveal';
import { tokens as t } from './tokens';
export function Checklist({
  items,
  completed = 0,
  checked,
  support,
  onPress,
}: {
  items: readonly string[];
  completed?: number;
  checked?: readonly boolean[];
  support?: readonly (string | undefined)[];
  onPress?: readonly (((index: number) => void) | undefined)[];
}) {
  return (
    <View style={{ gap: t.space.lg }}>
      {items.map((item, i) => (
        <Reveal key={item} index={i}>
          <Pressable
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={item}
            accessibilityHint={support?.[i]}
            accessibilityState={{
              checked: checked?.[i] ?? i < completed,
              disabled: !onPress?.[i],
            }}
            disabled={!onPress?.[i]}
            onPress={() => onPress?.[i]?.(i)}
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
                backgroundColor: (checked?.[i] ?? i < completed) ? t.icon.mint : t.surface.subtle,
                transitionProperty: 'backgroundColor',
                transitionDuration: t.motion.duration.standard,
              }}>
              {(checked?.[i] ?? i < completed) ? (
                <Reveal>
                  <Icon name="check" variant="utility" tint={t.state.success} size={t.layout.glyph} />
                </Reveal>
              ) : (
                <Label variant="support" tone="secondary">
                  {i + 1}
                </Label>
              )}
            </Animated.View>
            <View style={{ flex: 1, gap: t.space.xs }}>
              <Label>{item}</Label>
              {support?.[i] ? (
                <Label variant="support" tone="secondary">
                  {support[i]}
                </Label>
              ) : null}
            </View>
          </Pressable>
        </Reveal>
      ))}
    </View>
  );
}
