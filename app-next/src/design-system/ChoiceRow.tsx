import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { PressableScale } from './PressableScale';
import { Reveal } from '../motion/Reveal';
import type { ChoiceEmphasis } from './ActivityCard';
import { SelectionCheck } from './SelectionCheck';
export function ChoiceRow({
  title,
  support,
  selected = false,
  onPress,
  icon,
  leading,

  multiple = false,
  compact = false,
  emphasis = 'outline',
}: {
  title: string;
  support?: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  leading?: ReactNode;
  recommended?: boolean;
  multiple?: boolean;
  compact?: boolean;
  emphasis?: ChoiceEmphasis;
}) {
  const solid = emphasis === 'solid' && selected;
  void compact; // sizing is universal — compact retained for API compat only
  return (
    <PressableScale
      label={title}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}>
      <Animated.View
        style={{
          minHeight: t.control.row,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.lg,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.lg,
          borderRadius: t.radius.card,
          borderWidth: selected ? t.stroke.selected : t.stroke.hairline,
          borderColor: solid ? t.brand.primary : selected ? t.border.selected : t.border.outline,
          backgroundColor: solid ? t.brand.primary : selected ? t.surface.selected : t.surface.card,
          transitionProperty: ['borderColor', 'backgroundColor'],
          transitionDuration: t.motion.duration.standard,
        }}>
        {leading ?? (icon ? <Icon name={icon} tone={solid ? 'onAccent' : undefined} /> : null)}
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Label variant="label" style={{ color: solid ? t.text.onAccent : t.text.primary }}>
            {title}
          </Label>

          {support ? (
            <Label variant="support" tone="secondary" style={solid ? { color: t.text.onAccent } : undefined}>
              {support}
            </Label>
          ) : null}
        </View>
        {solid ? (
          <SelectionCheck />
        ) : (
          <View
            style={{
              width: t.control.indicator,
              height: t.control.indicator,
              borderRadius: t.radius.pill,
              borderWidth: t.stroke.selected,
              borderColor: selected ? t.brand.primary : t.border.outline,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {selected ? (
              <Reveal>
                <Icon name="check" size={t.icon.md} variant="utility" />
              </Reveal>
            ) : null}
          </View>
        )}
      </Animated.View>
    </PressableScale>
  );
}
