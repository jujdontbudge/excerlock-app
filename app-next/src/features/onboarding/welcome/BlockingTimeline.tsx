import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { onboardingLabels as c } from '../../../content/onboarding';
import { useMotion } from '../../../motion/useMotion';
export function BlockingTimeline() {
  const m = useMotion();
  return (
    <View style={{ gap: t.space.sm }}>
      <Animated.View
        style={{
          height: t.space.xs,
          marginHorizontal: t.space.xs,
          backgroundColor: t.text.onAccent,
          borderRadius: t.radius.pill,
          animationName: m.reduced
            ? undefined
            : { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } },
          animationDuration: m.duration.reveal,
          animationDelay: m.duration.standard,
          animationFillMode: 'both',
          transformOrigin: 'left center',
        }}>
        {[{ left: -t.space.xs }, { right: -t.space.xs }].map((side, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: -t.space.xs / 2,
              ...side,
              width: t.space.sm,
              height: t.space.sm,
              borderRadius: t.radius.pill,
              backgroundColor: t.text.onAccent,
            }}
          />
        ))}
      </Animated.View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label variant="support" tone="onAccent">
          {c.introStart}
        </Label>
        <Label variant="support" tone="onAccent">
          {c.introEnd}
        </Label>
      </View>
    </View>
  );
}
