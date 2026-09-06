import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { assetRegistry } from '@/content';

import { motion } from './tokens';
import { StaticVectorImage } from './StaticVectorImage';

export type HeroLockState = 'locked' | 'unlocked' | 'transitioning' | 'paused';

export interface HeroLockProps {
  accessibilityLabel?: string;
  size?: number;
  state: HeroLockState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const lockUnified = assetRegistry.heroes['lock-unified'];

export function HeroLock({ accessibilityLabel, size = 180, state, style, testID }: HeroLockProps) {
  const reduceMotion = useReducedMotion();
  const open = state === 'unlocked' || state === 'transitioning';
  const duration = reduceMotion ? 0 : motion.duration.ring;
  const lockedPose = [
    { translateX: 0 },
    { translateY: 0 },
    { rotate: '0deg' },
    { scale: 1 },
  ];
  const openPose = [
    { translateX: size * 0.025 },
    { translateY: -size * 0.035 },
    { rotate: '2deg' },
    { scale: 1.025 },
  ];
  const targetPose = open ? openPose : lockedPose;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? (open ? 'Apps unlocked' : state === 'paused' ? 'Access paused' : 'Apps locked')}
      style={[styles.host, { height: size, width: size }, state === 'paused' && styles.paused, style]}
      testID={testID}
    >
      <Animated.View
        style={{
          height: size,
          left: 0,
          position: 'absolute',
          top: 0,
          transform: reduceMotion
            ? targetPose
            : state === 'transitioning'
              ? [{ translateX: 0 }, { translateY: -size * 0.02 }, { rotate: '-1.5deg' }, { scale: 1.04 }]
              : targetPose,
          transitionDuration: duration,
          transitionProperty: 'transform',
          transitionTimingFunction: cubicBezier(0.16, 1, 0.3, 1),
          width: size,
        }}
      >
        <StaticVectorImage source={lockUnified} style={styles.art} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { height: '100%', width: '100%' },
  host: { alignSelf: 'center' },
  paused: { opacity: 0.6 },
});
