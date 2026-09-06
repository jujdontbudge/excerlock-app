import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, space } from './tokens';

export interface DottedSeparatorProps {
  style?: StyleProp<ViewStyle>;
}

const dots = Array.from({ length: 72 }, (_, index) => index);

/** A stable GO Club-style dotted rule; native dotted borders render inconsistently on iOS. */
export function DottedSeparator({ style }: DottedSeparatorProps) {
  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.line, style]}>
      {dots.map((dot) => <View key={dot} style={styles.dot} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: colors.surface.divider,
    borderRadius: 1,
    flexShrink: 0,
    height: 2,
    width: 2,
  },
  line: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[2],
    height: 2,
    overflow: 'hidden',
    width: '100%',
  },
});
