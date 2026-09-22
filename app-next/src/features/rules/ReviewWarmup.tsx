import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading, Label, PressableScale, SecondaryButton } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { planCopy as c } from '../../content/plan';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { profileStore as useProfileStore } from '../../state/profileStore';
export function ReviewWarmup({ onSkip }: { onSkip: () => void }) {
  const rating = useProfileStore((s) => s.data.warmupRating ?? 0);
  return (
    <>
      <Heading title={c.S4} support={c.ratingBody} />
      <LivingIcon name="heart" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Reveal key={n} index={n}>
            <PressableScale
              label={c.star(n)}
              accessibilityRole="radio"
              accessibilityState={{ checked: rating === n }}
              onPress={() => useProfileStore.getState().patch({ warmupRating: n })}
              style={{ minWidth: t.control.inline, alignItems: 'center' }}>
              <Animated.View
                style={{
                  opacity: n <= rating ? 1 : 0.35,
                  transform: [{ scale: n === rating ? t.motion.scale.selected : 1 }],
                  transitionProperty: ['opacity', 'transform'],
                  transitionDuration: t.motion.duration.standard,
                }}>
                <Icon name="star" size={t.icon.lg} />
              </Animated.View>
            </PressableScale>
          </Reveal>
        ))}
      </View>
      <Label tone="secondary">{c.ratingHelper}</Label>
      <SecondaryButton label={c.notNow} variant="tertiary" onPress={onSkip} />
    </>
  );
}
