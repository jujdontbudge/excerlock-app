import Animated from 'react-native-reanimated';
import { Pictogram } from '../Pictogram';
import { ActivityId } from '../activitiesCopy';
import { Label } from '../Label';
import { PressableScale } from '../PressableScale';
import { tokens as t } from '../tokens';
import { View } from 'react-native';
import { SelectionCheck } from '../SelectionCheck';
import { useMotion } from '../useMotion';
export type ChoiceEmphasis = 'solid' | 'outline';
export function ActivityCard({
  activity,
  title,
  selected,
  onPress,
  emphasis = 'outline',
}: {
  activity: ActivityId;
  title: string;
  selected: boolean;
  onPress: () => void;
  emphasis?: ChoiceEmphasis;
}) {
  const m = useMotion();
  const solid = emphasis === 'solid' && selected;
  return (
    <PressableScale
      label={title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      haptic={selected ? 'none' : 'select'}
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
          borderColor: solid ? t.brand.primary : selected ? t.border.selected : t.border.outline,
          backgroundColor: solid ? t.brand.primary : selected ? t.surface.selected : t.surface.card,
          ...m.transition(['backgroundColor', 'borderColor'], 'standard'),
        }}>
        <Pictogram name={activity} size="card" tone={solid ? 'onAccent' : undefined} />
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
