import type { ReactNode } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { VectorIcon } from './VectorIcon';
import { colors, iconSize, radius } from './tokens';

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
  /** Retained for API compatibility; accepted SVG glyphs keep their authored white fill. */
  tintColor?: string;
  variant?: IconChipVariant;
}

const sizes: Record<IconChipSize, { host: number; glyph: number }> = {
  xs: { host: 28, glyph: iconSize.inline },
  sm: { host: 32, glyph: iconSize.compact },
  md: { host: 44, glyph: iconSize.standard },
  lg: { host: 56, glyph: 36 },
  hero: { host: 112, glyph: 72 },
};

const fills: Record<IconChipVariant, string> = {
  white: 'transparent',
  dark: 'transparent',
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
  variant = 'dark',
}: IconChipProps) {
  const metrics = sizes[size];
  const content = (
    <View
      style={[
        styles.host,
        { backgroundColor: fills[variant], height: metrics.host, width: metrics.host },
        style,
      ]}
      testID={testID}
    >
      {source ? (
        <VectorIcon
          source={source}
          style={{ height: metrics.glyph * glyphScale, width: metrics.glyph * glyphScale }}
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
  host: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center' },
});
