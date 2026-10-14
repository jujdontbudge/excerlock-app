import { ImageSourcePropType, StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { DemoState, Scenario, snapshot, stride } from './model';

export type Cast = 'boy' | 'girl';
const frames: Record<Cast, Record<'phone' | 'free', ImageSourcePropType[]>> = {
  boy: {
    phone: [
      require('../../../../../assets/condition-demo/frames/walk-1.png'),
      require('../../../../../assets/condition-demo/frames/walk-2.png'),
      require('../../../../../assets/condition-demo/frames/walk-3.png'),
      require('../../../../../assets/condition-demo/frames/walk-4.png'),
      require('../../../../../assets/condition-demo/frames/walk-5.png'),
      require('../../../../../assets/condition-demo/frames/walk-6.png'),
      require('../../../../../assets/condition-demo/frames/stand-phone.png'),
      require('../../../../../assets/condition-demo/frames/stand-ahead.png'),
    ],
    free: [
      require('../../../../../assets/condition-demo/frames-free/walk-1.png'),
      require('../../../../../assets/condition-demo/frames-free/walk-2.png'),
      require('../../../../../assets/condition-demo/frames-free/walk-3.png'),
      require('../../../../../assets/condition-demo/frames-free/walk-4.png'),
      require('../../../../../assets/condition-demo/frames-free/walk-5.png'),
      require('../../../../../assets/condition-demo/frames-free/walk-6.png'),
      require('../../../../../assets/condition-demo/frames-free/stand-a.png'),
      require('../../../../../assets/condition-demo/frames-free/stand-b.png'),
    ],
  },
  girl: {
    phone: [
      require('../../../../../assets/condition-demo/frames/girl-walk-1.png'),
      require('../../../../../assets/condition-demo/frames/girl-walk-2.png'),
      require('../../../../../assets/condition-demo/frames/girl-walk-3.png'),
      require('../../../../../assets/condition-demo/frames/girl-walk-4.png'),
      require('../../../../../assets/condition-demo/frames/girl-walk-5.png'),
      require('../../../../../assets/condition-demo/frames/girl-walk-6.png'),
      require('../../../../../assets/condition-demo/frames/girl-stand-phone.png'),
      require('../../../../../assets/condition-demo/frames/girl-stand-ahead.png'),
    ],
    free: [
      require('../../../../../assets/condition-demo/frames-free/girl-walk-1.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-walk-2.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-walk-3.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-walk-4.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-walk-5.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-walk-6.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-stand-a.png'),
      require('../../../../../assets/condition-demo/frames-free/girl-stand-b.png'),
    ],
  },
};
function Frame({
  source,
  index,
  clock,
  scenario,
  reduced,
}: {
  source: ImageSourcePropType;
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    if (!state.walking) return { opacity: index === (state.phase === 'blocked' ? 7 : 6) ? 1 : 0 };
    const { first, second, mix } = stride(clock.value.walkTime);
    return {
      zIndex: index === second - 1 ? 1 : 0,
      opacity: index === first - 1 ? 1 : !reduced && index === second - 1 ? mix : 0,
    };
  });
  return (
    <Animated.Image
      testID={`condition-demo-frame-${index}`}
      source={source}
      resizeMode="contain"
      fadeDuration={0}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }, style]}
    />
  );
}
export function Character({
  clock,
  scenario,
  reduced,
  cast,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  reduced: boolean;
  cast: Cast;
}) {
  const bob = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: reduced
          ? 0
          : snapshot(clock.value, scenario).walking
            ? -3 * Math.abs(Math.sin((clock.value.walkTime * 9 * Math.PI) / 2))
            : -1.2 * Math.sin(clock.value.time * 2.2),
      },
    ],
  }));
  const sources = frames[cast][scenario.place === 'treadmill' ? 'free' : 'phone'];
  const bankWalker = scenario.kind === 'walk-bank';
  const compact = scenario.kind !== 'walk-state' && !bankWalker;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: compact ? 16 : bankWalker ? 4 : 10,
          bottom: 112,
          width: compact ? 145 : bankWalker ? 190 : 160,
          height: compact ? 216 : bankWalker ? 283 : 238,
        },
        bob,
      ]}>
      {sources.map((source, index) => (
        <Frame key={index} {...{ source, index, clock, scenario, reduced }} />
      ))}
    </Animated.View>
  );
}
