import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { Image, StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { reportRuntimeError } from '../../../telemetry/reportRuntimeError';
import { DemoState, Scenario, snapshot, stride } from './model';

export type Cast = 'boy' | 'girl';
const frames: Record<Cast, Record<'phone' | 'free', number[]>> = {
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
  source: number;
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  reduced: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void Asset.fromModule(source).downloadAsync().then((asset) => {
      if (!asset.localUri) throw new Error('Condition demo frame has no local file');
      if (live) setUri(asset.localUri);
    }).catch(reportRuntimeError);
    return () => { live = false; };
  }, [source]);
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
    <Animated.View
      testID={`condition-demo-frame-${index}`}
      style={[StyleSheet.absoluteFill, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="contain"
          fadeDuration={0}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        />
      ) : null}
    </Animated.View>
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
        <Frame key={source} {...{ source, index, clock, scenario, reduced }} />
      ))}
    </Animated.View>
  );
}
