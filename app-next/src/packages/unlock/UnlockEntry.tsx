import { Pressable, View } from 'react-native';
import { Label } from '../ui';
import { tokens as t } from '../ui/tokens';
import { Icon } from '../ui/Icon';
import { haptic } from '../ui/haptics';
export function UnlockEntry({
  kind,
  label,
  onPress,
  detail,
  inverted = false,
}: {
  kind: 'gym' | 'treadmill' | 'walking';
  label: string;
  onPress: () => void;
  detail?: string;
  inverted?: boolean;
}) {
  return (
    <View style={{ gap: t.space.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          haptic('tap');
          onPress();
        }}
        style={({ pressed }) => ({
          backgroundColor: inverted ? t.brand.primary : t.brand.light,
          borderRadius: t.radius.pill,
          height: t.control.full,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space.md,
          transform: [{ scale: pressed ? t.motion.scale.pressed : 1 }],
        })}>
        <Icon name={kind === 'gym' ? 'gym' : 'walking'} variant="utility" size={t.icon.md} tone={inverted ? 'onAccent' : 'accent'} />
        <Label variant="label" style={{ color: inverted ? t.text.onAccent : t.text.primary }}>
          {label}
        </Label>
      </Pressable>
      {detail ? (
        <Label variant="support" tone="onAccent" style={{ textAlign: 'center' }}>
          {detail}
        </Label>
      ) : null}
    </View>
  );
}
