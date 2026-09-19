import { ImageSourcePropType, StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { DemoState, Scenario, snapshot, stride } from './model';

const phoneFrames = [
  require('../../../../assets/condition-demo/frames/walk-1.png'),
  require('../../../../assets/condition-demo/frames/walk-2.png'),
  require('../../../../assets/condition-demo/frames/walk-3.png'),
  require('../../../../assets/condition-demo/frames/walk-4.png'),
  require('../../../../assets/condition-demo/frames/walk-5.png'),
  require('../../../../assets/condition-demo/frames/walk-6.png'),
  require('../../../../assets/condition-demo/frames/stand-phone.png'),
  require('../../../../assets/condition-demo/frames/stand-ahead.png'),
];
const freeFrames = [
  require('../../../../assets/condition-demo/frames-free/walk-1.png'),
  require('../../../../assets/condition-demo/frames-free/walk-2.png'),
  require('../../../../assets/condition-demo/frames-free/walk-3.png'),
  require('../../../../assets/condition-demo/frames-free/walk-4.png'),
  require('../../../../assets/condition-demo/frames-free/walk-5.png'),
  require('../../../../assets/condition-demo/frames-free/walk-6.png'),
  require('../../../../assets/condition-demo/frames-free/stand-a.png'),
  require('../../../../assets/condition-demo/frames-free/stand-b.png'),
];
function Frame({
  source,
  index,
  clock,
  scenario,
  reduced,
  onLoad,
}: {
  source: ImageSourcePropType;
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  reduced: boolean;
  onLoad: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    if (!state.walking) return { opacity: index === (state.phase === 'blocked' ? 7 : 6) ? 1 : 0 };
    const { first, second, mix } = stride(clock.value.walkTime);
    // All canvases stay decoded/mounted; only the adjacent pair is visible.
    // The lower frame remains opaque while the next pose fades over it.
    return {
      zIndex: index === second - 1 ? 1 : 0,
      opacity: index === first - 1 ? 1 : !reduced && index === second - 1 ? mix : 0,
    };
  });
  return (
    <Animated.Image
      source={source}
      resizeMode="contain"
      fadeDuration={0}
      onLoad={onLoad}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}
export function Character({
  clock,
  scenario,
  reduced,
  onLoad,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  reduced: boolean;
  onLoad: () => void;
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
  const frames = scenario.place === 'treadmill' ? freeFrames : phoneFrames;
  const compact = scenario.kind !== 'walk-state';
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: compact ? 16 : 10,
          bottom: 52,
          width: compact ? 145 : 160,
          height: compact ? 216 : 238,
        },
        bob,
      ]}>
      {frames.map((source, index) => (
        <Frame key={index} {...{ source, index, clock, scenario, reduced, onLoad }} />
      ))}
    </Animated.View>
  );
}
