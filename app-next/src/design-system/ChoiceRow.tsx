import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { PressableScale } from './PressableScale';
import { Reveal } from '../motion/Reveal';
import { controls } from '../content/controls';
import { useSolidChoices } from './ChoiceAppearance';
import { SelectionCheck } from './SelectionCheck';
export function ChoiceRow({
  title,
  support,
  selected = false,
  onPress,
  icon,
  leading,
  recommended = false,
  multiple = false,
}: {
  title: string;
  support?: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  leading?: ReactNode;
  recommended?: boolean;
  multiple?: boolean;
}) {
  const solid = useSolidChoices() && selected;
  return (
    <PressableScale
      label={title}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}>
      <Animated.View
        style={{
          minHeight: t.layout.row,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          padding: t.space.lg,
          borderRadius: t.radius.choice,
          borderWidth: selected ? t.stroke.selected : t.stroke.hairline,
          borderColor: solid ? t.brand.primary : selected ? t.border.selected : t.border.default,
          backgroundColor: solid ? t.brand.primary : selected ? t.surface.selected : t.surface.card,
          transitionProperty: ['borderColor', 'backgroundColor'],
          transitionDuration: t.motion.duration.standard,
        }}>
        {leading ?? (icon ? <Icon name={icon} /> : null)}
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Label variant="label" style={{ color: solid ? t.text.onAccent : t.text.primary }}>
            {title}
          </Label>
          {recommended ? (
            <Label variant="badge" style={{ color: solid ? t.text.onAccent : t.brand.primary }}>
              {controls.recommended}
            </Label>
          ) : null}
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
              width: t.layout.glyph,
              height: t.layout.glyph,
              borderRadius: t.radius.pill,
              borderWidth: selected ? t.stroke.selected : t.stroke.hairline,
              borderColor: selected ? t.brand.primary : t.border.default,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {selected ? (
              <Reveal>
                <Icon name="check" size={t.space.lg} variant="utility" tint={t.brand.primary} />
              </Reveal>
            ) : null}
          </View>
        )}
      </Animated.View>
    </PressableScale>
  );
}
