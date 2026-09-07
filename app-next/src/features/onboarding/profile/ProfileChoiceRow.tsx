import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label, PressableScale } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { Reveal } from '../../../motion/Reveal';
export function ProfileChoiceRow({
  title,
  selected,
  onPress,
  leading,
  radioFirst = false,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  radioFirst?: boolean;
}) {
  const radio = (
    <View
      style={{
        width: p.radio.size,
        height: p.radio.size,
        borderRadius: t.radius.pill,
        borderWidth: t.stroke.hairline,
        borderColor: selected ? t.brand.primary : t.text.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? (
        <Reveal>
          <View
            style={{
              width: p.radio.dot,
              height: p.radio.dot,
              borderRadius: t.radius.pill,
              backgroundColor: t.brand.primary,
            }}
          />
        </Reveal>
      ) : null}
    </View>
  );
  return (
    <PressableScale
      label={title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}>
      <Animated.View
        style={{
          minHeight: leading ? p.row.referralHeight : p.row.height,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.lg,
          paddingHorizontal: p.row.horizontal,
          paddingVertical: p.row.vertical,
          borderRadius: p.row.radius,
          borderWidth: t.stroke.hairline,
          borderColor: selected ? p.colors.selectedLine : p.colors.line,
          backgroundColor: selected ? p.colors.selected : leading ? p.colors.referral : p.colors.row,
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionDuration: t.motion.duration.standard,
        }}>
        {radioFirst ? radio : null}
        {leading}
        <Label style={{ ...p.rowType, flex: 1 }}>{title}</Label>
        {radioFirst ? null : radio}
      </Animated.View>
    </PressableScale>
  );
}
