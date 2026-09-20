import Animated from 'react-native-reanimated';
import { Icon } from '../icons/Icon';
import { ActivityId } from '../content/activities';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { View } from 'react-native';
import { useSolidChoices } from './ChoiceAppearance';
import { SelectionCheck } from './SelectionCheck';
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
  const solid = useSolidChoices() && selected;
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
          borderColor: solid ? t.brand.primary : selected ? t.border.selected : t.border.default,
          backgroundColor: solid ? t.brand.primary : selected ? t.surface.selected : t.surface.card,
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionDuration: t.motion.duration.standard,
        }}>
        <Icon name={activity} size={t.space.hero} tint={solid ? t.text.onAccent : undefined} />
        <Label variant="label" style={{ color: solid ? t.text.onAccent : t.text.primary }}>
          {title}
        </Label>
        {solid ? (
          <View style={{ position: 'absolute', top: t.space.sm, right: t.space.sm }}>
            <SelectionCheck />
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}
