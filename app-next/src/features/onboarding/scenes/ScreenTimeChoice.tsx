import { View } from 'react-native';
import { Label, PressableScale } from '../../../design-system';
import { SelectionCheck } from '../../../design-system/SelectionCheck';
import { tokens as t } from '../../../design-system/tokens';
export function ScreenTimeChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      label={label}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={{
        borderRadius: t.radius.card,
        backgroundColor: selected ? t.brand.pressed : t.border.divider,
        paddingBottom: t.space.xs,
      }}>
      <View
        style={{
          minHeight: t.layout.row,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: selected ? t.brand.primary : t.border.default,
          backgroundColor: selected ? t.brand.primary : t.surface.card,
          paddingHorizontal: t.space.xl,
          paddingVertical: t.space.lg,
        }}>
        <Label variant="label" style={{ flex: 1, color: selected ? t.text.onAccent : t.text.primary }}>
          {label}
        </Label>
        {selected ? <SelectionCheck /> : null}
      </View>
    </PressableScale>
  );
}
