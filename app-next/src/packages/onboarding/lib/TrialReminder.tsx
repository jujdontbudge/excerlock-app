import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { Label } from '../../ui/Label';
import { tokens as t } from '../../ui/tokens';
import { illustrationTokens as art } from '../../ui/illustrationTokens';
import { Icon } from '../../ui/Icon';
import { useMotion } from '../../ui/useMotion';
import { planCopy as c } from '../../conditions/planCopy';
import type { TrialOffer } from '../../ports/SubscriptionPort';
import { fallbackTrialOffer } from '../../subscription/trialOffer';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';

const bell = art.reminder;
const swing = Object.fromEntries(
  bell.swing.map((degrees, index) => [`${Math.round(((index + 1) * 100) / (bell.swing.length + 1))}%`, {
    transform: [{ rotate: `${degrees}deg` }],
  }]),
);

export function TrialReminder({ offer = fallbackTrialOffer }: { offer?: TrialOffer }) {
  const m = useMotion();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: t.space.xl }}>
      <Label accessibilityRole="header" variant="display" style={{ textAlign: 'center', maxWidth: 330 }}>
        {c.reminderTitle}
      </Label>
      <Label variant="label" style={{ textAlign: 'center' }}>{subscriptionCopy.reminder(offer)}</Label>
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
          <Label allowFontScaling={false} style={[bell.count, { color: t.text.onAccent }]}>
            1
          </Label>
        </View>
      </Animated.View>
      <View style={{ alignSelf: 'stretch', gap: t.space.md }}>
        {subscriptionCopy.timeline(offer).map((milestone) => (
          <Label key={milestone.title} variant="support" style={{ textAlign: 'center' }}>{milestone.title}</Label>
        ))}
      </View>
      <View style={{ flexGrow: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm }}>
        <Icon name="check" size={t.icon.md} />
        <Label variant="label">{c.noPayment}</Label>
      </View>
    </View>
  );
}
