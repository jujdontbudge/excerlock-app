import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { motion } from './tokens';

export type HeroLockState = 'locked' | 'unlocked' | 'transitioning' | 'paused';

export interface HeroLockProps {
  accessibilityLabel?: string;
  size?: number;
  state: HeroLockState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const lockBody = require('../../assets/heroes/lock-body.png');
const lockShackle = require('../../assets/heroes/lock-shackle.png');

export function HeroLock({ accessibilityLabel, size = 180, state, style, testID }: HeroLockProps) {
  const reduceMotion = useReducedMotion();
  const open = state === 'unlocked' || state === 'transitioning';
  const duration = reduceMotion ? motion.duration.fast : 650;
  const bodySize = size * 0.72;
  const shackleSize = size * 0.62;
  const shackleBase = {
    height: shackleSize,
    left: (size - shackleSize) / 2,
    position: 'absolute' as const,
    top: size * 0.03,
    width: shackleSize,
  };
  const lockedPose = [
    { translateX: 0 },
    { translateY: size * 0.08 },
    { rotate: '0deg' },
  ];
  const openPose = [
    { translateX: size * 0.16 },
    { translateY: -size * 0.1 },
    { rotate: '4deg' },
  ];

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? (open ? 'Apps unlocked' : state === 'paused' ? 'Access paused' : 'Apps locked')}
      style={[styles.host, { height: size, width: size }, state === 'paused' && styles.paused, style]}
      testID={testID}
    >
      {reduceMotion ? (
        <>
          <Animated.Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={lockShackle}
            style={{
              ...shackleBase,
              opacity: open ? 0 : 1,
              transform: lockedPose,
              transitionDuration: motion.duration.fast,
              transitionProperty: 'opacity',
              transitionTimingFunction: cubicBezier(0.2, 0, 0, 1),
            }}
          />
          <Animated.Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={lockShackle}
            style={{
              ...shackleBase,
              opacity: open ? 1 : 0,
              transform: openPose,
              transitionDuration: motion.duration.fast,
              transitionProperty: 'opacity',
              transitionTimingFunction: cubicBezier(0.2, 0, 0, 1),
            }}
          />
        </>
      ) : (
        <Animated.Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={lockShackle}
          style={{
            ...shackleBase,
            transform: open ? openPose : lockedPose,
            transitionDuration: duration,
            transitionProperty: 'transform',
            transitionTimingFunction: cubicBezier(0.16, 1, 0.3, 1),
          }}
        />
      )}
      <Animated.Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={lockBody}
        style={{
          bottom: 0,
          height: bodySize,
          left: (size - bodySize) / 2,
          position: 'absolute',
          transform: state === 'transitioning' && !reduceMotion ? [{ scale: 1.04 }, { rotate: '-2deg' }] : [{ scale: 1 }, { rotate: '0deg' }],
          transitionDuration: duration,
          transitionProperty: 'transform',
          transitionTimingFunction: cubicBezier(0.16, 1, 0.3, 1),
          width: bodySize,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center' },
  paused: { opacity: 0.6 },
});
