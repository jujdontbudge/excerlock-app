import { Pressable, View } from 'react-native';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { feedback } from '../../motion/haptics';
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
          feedback('press');
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
        <Icon name={kind === 'gym' ? 'gym' : 'walking'} variant="utility" size={t.icon.md} tint={inverted ? t.text.onAccent : t.brand.primary} />
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
