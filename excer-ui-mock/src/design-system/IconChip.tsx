import type { ReactNode } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { PressableScale } from './PressableScale';
import { colors, radius } from './tokens';

export type IconChipSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';
export type IconChipVariant = 'white' | 'dark' | 'primary' | 'energy' | 'success' | 'ivory';

export interface IconChipProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  glyphScale?: number;
  onPress?: () => void;
  size?: IconChipSize;
  source?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  tintColor?: string;
  variant?: IconChipVariant;
}

const sizes: Record<IconChipSize, { host: number; glyph: number }> = {
  xs: { host: 30, glyph: 17 },
  sm: { host: 34, glyph: 18 },
  md: { host: 44, glyph: 23 },
  lg: { host: 64, glyph: 32 },
  hero: { host: 120, glyph: 70 },
};

const fills: Record<IconChipVariant, string> = {
  white: colors.surface.light,
  dark: colors.surface.cardStrong,
  primary: colors.brand.primary,
  energy: colors.brand.energyAction,
  success: colors.semantic.success,
  ivory: colors.canvas.ivory,
};

export function IconChip({
  accessibilityLabel,
  children,
  glyphScale = 1,
  onPress,
  size = 'md',
  source,
  style,
  testID,
  tintColor,
  variant = 'dark',
}: IconChipProps) {
  const metrics = sizes[size];
  const resolvedTint = tintColor ?? (variant === 'white' || variant === 'ivory' ? colors.icon.dark : colors.icon.primary);
  const content = (
    <View
      style={[
        styles.host,
        { backgroundColor: fills[variant], height: metrics.host, width: metrics.host },
        variant === 'white' && styles.float,
        style,
      ]}
      testID={testID}
    >
      {source ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={source}
          style={{ height: metrics.glyph * glyphScale, width: metrics.glyph * glyphScale }}
          tintColor={resolvedTint}
        />
      ) : children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <PressableScale accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  float: {
    shadowColor: colors.canvas.contentTop,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
  },
  host: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center' },
});
