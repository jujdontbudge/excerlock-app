import Animated from 'react-native-reanimated';
import { Icon } from '../icons/Icon';
import { ActivityId } from '../content/activities';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
export function ActivityCard({
  activity,
  title,
  selected,
  onPress,
}: {
  activity: ActivityId;
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  const m = useMotion();
  return (
    <PressableScale
      label={title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}>
      <Animated.View
        style={{
          padding: t.space.xl,
          minHeight: t.layout.cardWidth,
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space.lg,
          borderRadius: t.radius.card,
          borderWidth: selected ? t.stroke.selected : t.stroke.hairline,
          borderColor: selected ? t.border.selected : t.border.default,
          backgroundColor: selected ? t.surface.selected : t.surface.card,
          transform: [{ translateY: selected ? -m.distance.float : 0 }],
          transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
          transitionDuration: m.duration.standard,
        }}>
        <Icon name={activity} size={t.space.hero} />
        <Label variant="label">{title}</Label>
      </Animated.View>
    </PressableScale>
  );
}
