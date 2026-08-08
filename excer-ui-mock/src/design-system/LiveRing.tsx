import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from './tokens';

export interface LiveRingProps {
  accessibilityLabel: string;
  caption?: string;
  children?: ReactNode;
  color?: string;
  progress: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  value?: string;
}

const segmentCount = 48;

export function LiveRing({
  accessibilityLabel,
  caption,
  children,
  color = colors.semantic.earn,
  progress,
  size = 240,
  style,
  value,
}: LiveRingProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const activeSegments = Math.round(clamped * segmentCount);
  const stroke = Math.max(7, Math.round(size * 0.04));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100), text: value }}
      style={[styles.host, { height: size, width: size }, style]}
    >
      {Array.from({ length: segmentCount }, (_, index) => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          key={index}
          style={{
            backgroundColor: index < activeSegments ? color : colors.surface.trackDark,
            borderRadius: stroke / 2,
            height: stroke * 1.35,
            left: size / 2 - stroke / 2,
            position: 'absolute',
            top: size / 2 - stroke * 0.675,
            transform: [{ rotate: `${(index / segmentCount) * 360}deg` }, { translateY: -(size / 2 - stroke) }],
            width: stroke,
          }}
        />
      ))}
      <View style={styles.center}>
        {children ?? <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.value, { maxWidth: size * 0.58 }]}>{value}</Text>}
        {caption ? <Text numberOfLines={2} style={[styles.caption, { maxWidth: size * 0.56 }]}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { ...type.caption, color: colors.text.secondary, marginTop: 4, textAlign: 'center' },
  center: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  host: { alignSelf: 'center' },
  value: { ...type.heroMd, color: colors.text.primary, textAlign: 'center' },
});
