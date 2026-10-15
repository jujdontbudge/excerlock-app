import { useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { measureBox, useFlyToTarget } from './FlyToTarget';
import { Label } from './Label';
import { PointsToken } from './PointsToken';
import { PressableScale } from './PressableScale';
import { opacityOut, popIn } from './presets';
import { rewards, type PointsActivity } from './rewardsCopy';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

export const collectFlightCount = (amount: number) => (amount < 300 ? 8 : amount < 1500 ? 12 : amount < 4000 ? 16 : 20);

export function CollectChip({
  activity,
  amount,
  target = 'points',
  first = false,
  onCollect,
  onLanded,
}: {
  activity: PointsActivity;
  amount: number;
  target?: string;
  first?: boolean;
  onCollect: () => void;
  onLanded?: () => void;
}) {
  const m = useMotion();
  const fly = useFlyToTarget();
  const ref = useRef<View>(null);
  const [spent, setSpent] = useState(false);
  const collect = async () => {
    if (spent) return;
    setSpent(true);
    const from = await measureBox(ref);
    const flight = fly({
      from: from ?? ref,
      to: target,
      count: collectFlightCount(amount),
      spread: 'burst',
      size: t.points.flight,
      celebrate: first,
      haptic: 'success',
      token: () => <PointsToken activity={activity} size={t.points.flight} />,
    });
    onCollect();
    await flight;
    onLanded?.();
  };
  return (
    <Animated.View entering={popIn(m.reduced)} exiting={opacityOut()} style={{ alignSelf: 'center', opacity: spent ? 0 : 1, ...m.transition('opacity', 'press') }}>
      <View ref={ref} collapsable={false}>
        <PressableScale
          label={rewards.collect(amount)}
          haptic="tap"
          onPress={() => void collect()}
          style={{
            height: t.points.chip,
            paddingLeft: t.space.sm,
            paddingRight: t.space.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.sm,
            borderRadius: t.radius.pill,
            backgroundColor: t.brand.primary,
            boxShadow: t.shadow.cta,
          }}>
          <PointsToken activity={activity} size={t.points.pill + t.space.xs} tone="onAccent" />
          <Label variant="label" tone="onAccent">
            {rewards.collectChip(amount)}
          </Label>
        </PressableScale>
      </View>
    </Animated.View>
  );
}
