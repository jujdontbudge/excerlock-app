import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from './tokens';

export type PillowCardVariant = 'subtle' | 'elevated' | 'strong' | 'grouped' | 'light' | 'night' | 'bubble';
export type PillowCardPadding = 'none' | 'compact' | 'standard';

export interface PillowCardProps extends PropsWithChildren {
  padding?: PillowCardPadding;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: PillowCardVariant;
}

const fills: Record<PillowCardVariant, string> = {
  subtle: 'transparent',
  elevated: 'transparent',
  strong: colors.surface.cardStrong,
  grouped: 'transparent',
  light: 'transparent',
  night: colors.surface.bubble,
  bubble: colors.surface.bubble,
};

export function PillowCard({ children, padding = 'standard', style, testID, variant = 'subtle' }: PillowCardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'subtle' || variant === 'elevated' || variant === 'grouped' || variant === 'light' ? styles.open : null,
        variant === 'strong' || variant === 'night' || variant === 'bubble' ? styles.bubble : null,
        { backgroundColor: fills[variant] },
        padding === 'compact' ? styles.compact : padding === 'standard' ? styles.standard : null,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  bubble: { borderColor: colors.surface.bubbleBorder, borderRadius: radius.card, borderWidth: 1 },
  compact: { padding: space[3] },
  open: { borderRadius: 0, overflow: 'visible' },
  standard: { padding: space[4] },
});
