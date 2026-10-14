import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFlyTarget, useLandingValue } from './FlyToTarget';
import { Label } from './Label';
import { PointsToken } from './PointsToken';
import { PressableScale } from './PressableScale';
import { formatPoints, RollingNumber } from './RollingNumber';
import { rewards, type PointsActivity } from './rewardsCopy';
import { tokens as t } from './tokens';

export function PointsPill({
  activity,
  points,
  target = 'points',
  size = 'pill',
  onPress,
}: {
  activity: PointsActivity;
  points: number;
  target?: string;
  size?: 'pill' | 'hero';
  onPress?: () => void;
}) {
  const { ref, anchor, style } = useFlyTarget(target);
  const shown = useLandingValue(target, points);
  const hero = size === 'hero';
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: hero ? t.space.md : t.space.sm }}>
      <View ref={anchor} collapsable={false}>
        <PointsToken activity={activity} size={hero ? t.points.hero : t.points.pill} />
      </View>
      <RollingNumber value={shown} variant={hero ? 'metric' : 'section'} label={rewards.points(points)} />
    </View>
  );
  const pill = {
    height: t.control.inline,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.surface.softChoice,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return (
    <Animated.View ref={ref} collapsable={false} style={[{ alignSelf: 'center' }, style]}>
      {hero ? (
        content
      ) : onPress ? (
        <PressableScale label={rewards.points(points)} onPress={onPress} style={pill}>
          {content}
        </PressableScale>
      ) : (
        <View style={pill}>{content}</View>
      )}
    </Animated.View>
  );
}

export function PointsLabel({ activity, points, tone = 'primary' }: { activity: PointsActivity; points: number; tone?: 'primary' | 'onAccent' | 'secondary' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.xs }}>
      <PointsToken activity={activity} size={t.points.card} tone={tone === 'onAccent' ? 'onAccent' : 'accent'} />
      <Label variant="label" tone={tone}>
        {formatPoints(points)}
      </Label>
    </View>
  );
}
