import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label, PressableScale } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { SelectionCheck } from '../../../design-system/SelectionCheck';
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
  const radio = selected ? (
    <SelectionCheck size={p.radio.size} />
  ) : (
    <View
      style={{
        width: p.radio.size,
        height: p.radio.size,
        borderRadius: t.radius.pill,
        borderWidth: t.stroke.selected,
        borderColor: selected ? t.brand.primary : t.text.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}></View>
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
          borderWidth: t.stroke.selected,
          borderColor: selected ? t.brand.primary : p.colors.line,
          backgroundColor: selected ? t.brand.primary : leading ? p.colors.referral : p.colors.row,
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionDuration: t.motion.duration.standard,
        }}>
        {radioFirst ? radio : null}
        {leading}
        <Label style={{ ...p.rowType, flex: 1, color: selected ? t.text.onAccent : t.text.primary }}>{title}</Label>
        {radioFirst ? null : radio}
      </Animated.View>
    </PressableScale>
  );
}
