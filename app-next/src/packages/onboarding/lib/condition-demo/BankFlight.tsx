import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { DemoState, Scenario, snapshot } from './model';
import { bankStory, tokenFlight } from './bankStory';
import { PointsToken } from './PointsToken';

type Point = { x: number; y: number };
const size = 26;

function Token({
  index,
  clock,
  scenario,
  from,
  bend,
  to,
}: {
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  from: Point;
  bend: Point;
  to: Point;
}) {
  const style = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const p = tokenFlight(index, state.phase, state.local);
    if (p < 0) return { opacity: 0, transform: [{ translateX: from.x }, { translateY: from.y }, { scale: 0.5 }] };
    const e = p * p * (3 - 2 * p);
    const a = (1 - e) * (1 - e),
      b = 2 * e * (1 - e),
      c = e * e;
    const x = a * from.x + b * bend.x + c * to.x;
    const y = a * from.y + b * bend.y + c * to.y;
    return {
      opacity: Math.min(1, p / 0.12),
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { scale: 0.6 + 0.45 * Math.sin(Math.PI * Math.min(1, p * 1.6) * 0.5) - 0.35 * Math.max(0, (p - 0.7) / 0.3) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <PointsToken size={size} rim activity={scenario.kind === 'gym-bank' ? 'gym' : 'walking'} />
    </Animated.View>
  );
}

export function BankFlight({
  clock,
  scenario,
  from,
  bend,
  to,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  from: Point;
  bend: Point;
  to: Point;
}) {
  return (
    <>
      {Array.from({ length: bankStory.tokens }, (_, index) => (
        <Token key={index} {...{ index, clock, scenario, from, bend, to }} />
      ))}
    </>
  );
}
