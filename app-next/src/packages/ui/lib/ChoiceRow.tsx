import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { Icon, IconName } from '../Icon';
import { PressableScale } from '../PressableScale';
import { Reveal } from '../Reveal';
import type { ChoiceEmphasis } from './ActivityCard';
import { SelectionCheck } from '../SelectionCheck';
import { useSetupPresentation } from '../SetupPresentation';
import { useMotion } from '../useMotion';
import type { HapticIntent } from '../haptics';
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
  soft = true,
  haptic = multiple || !selected ? 'select' : 'none',
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
  soft?: boolean;
  haptic?: HapticIntent;
}) {
  const m = useMotion();
  const centred = useSetupPresentation();
  const solid = (emphasis === 'solid' || centred || soft) && selected;
  const lead = leading ?? (icon ? <Icon name={icon} tone={solid ? 'onAccent' : undefined} /> : null);
  const slot = { width: t.icon.lg, alignItems: 'center' as const };
  void compact;
  const indicator = solid ? (
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
  );
  return (
    <PressableScale
      label={title}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, selected }}
      haptic={haptic}
      onPress={onPress}>
      <Animated.View
        style={{
          minHeight: soft ? t.control.softRow : t.control.row,
          flexDirection: 'row',
          alignItems: 'center',
          gap: soft ? t.space.sm : t.space.lg,
          paddingHorizontal: t.space.lg,
          paddingVertical: soft ? t.space.md : t.space.lg,
          borderRadius: soft ? t.radius.choice : t.radius.card,
          borderWidth: soft ? 0 : selected ? t.stroke.selected : t.stroke.hairline,
          borderColor: solid ? t.brand.primary : selected ? t.border.selected : t.border.outline,
          backgroundColor: solid ? t.brand.primary : soft ? t.surface.softChoice : selected ? t.surface.selected : t.surface.card,
          ...m.transition(['borderColor', 'backgroundColor'], 'standard'),
        }}>
        {centred && !soft ? <View style={slot}>{lead}</View> : lead}
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Label variant="label" style={[{ color: solid ? t.text.onAccent : t.text.primary }, soft && { textAlign: 'left' }]}>
            {title}
          </Label>

          {support ? (
            <Label variant="support" tone="secondary" style={solid ? { color: t.text.onAccent } : undefined}>
              {support}
            </Label>
          ) : null}
        </View>
        {soft ? null : centred ? <View style={slot} /> : indicator}
      </Animated.View>
    </PressableScale>
  );
}
