import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { Label } from '../../design-system/Label';
import { tokens as t } from '../../design-system/tokens';
import { illustrationTokens as art } from '../../design-system/illustrationTokens';
import { Icon } from '../../icons/Icon';
import { useMotion } from '../../motion/useMotion';
import { planCopy as c } from '../../content/plan';

const bell = art.reminder;
const swing = Object.fromEntries(
  bell.swing.map((degrees, index) => [`${Math.round(((index + 1) * 100) / (bell.swing.length + 1))}%`, {
    transform: [{ rotate: `${degrees}deg` }],
  }]),
);

export function TrialReminder() {
  const m = useMotion();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: t.space.xl }}>
      <Label accessibilityRole="header" variant="display" style={{ textAlign: 'center', maxWidth: 330 }}>
        {c.reminderTitle}
      </Label>
      <Animated.View
        accessible
        accessibilityRole="image"
        accessibilityLabel={c.reminderArt}
        style={{
          width: bell.size,
          height: bell.size,
          transformOrigin: '50% 4%',
          ...m.keyframes(
            { from: { transform: [{ rotate: '0deg' }] }, ...swing, to: { transform: [{ rotate: '0deg' }] } },
            'emphasized',
            { delay: m.duration.standard, spread: m.duration.standard },
          ),
        }}>
        <SymbolView name="bell.fill" size={bell.size} tintColor={bell.bell} />
        <View
          style={{
            position: 'absolute',
            left: bell.size * bell.badgeX - bell.badgeSize / 2,
            top: bell.size * bell.badgeY - bell.badgeSize / 2,
            width: bell.badgeSize,
            height: bell.badgeSize,
            borderRadius: t.radius.pill,
            backgroundColor: bell.badge,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Label allowFontScaling={false} style={[bell.count, { color: t.text.onAccent, transform: [{ translateY: bell.count.fontSize * t.optical.centre }] }]}>
            1
          </Label>
        </View>
      </Animated.View>
      <View style={{ flexGrow: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm }}>
        <Icon name="check" size={t.icon.md} />
        <Label variant="label">{c.noPayment}</Label>
      </View>
    </View>
  );
}
