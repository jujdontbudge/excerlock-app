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
}: {
  kind: 'gym' | 'treadmill';
  label: string;
  onPress: () => void;
  detail?: string;
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
          backgroundColor: 'white',
          borderRadius: t.radius.pill,
          height: t.layout.button,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space.md,
          transform: [{ scale: pressed ? t.motion.scale.pressed : 1 }],
        })}>
        <Icon name={kind === 'gym' ? 'gym' : 'walking'} variant="utility" size={24} tint={t.brand.primary} />
        <Label variant="label" style={{ color: t.brand.primary }}>
          {label}
        </Label>
      </Pressable>
      {detail ? (
        <Label variant="support" tone="onAccent" style={{ opacity: 0.8, textAlign: 'center' }}>
          {detail}
        </Label>
      ) : null}
    </View>
  );
}
