import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from './tokens';

export type PillowCardVariant = 'subtle' | 'elevated' | 'strong' | 'grouped' | 'light' | 'night';
export type PillowCardPadding = 'none' | 'compact' | 'standard';

export interface PillowCardProps extends PropsWithChildren {
  padding?: PillowCardPadding;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: PillowCardVariant;
}

const fills: Record<PillowCardVariant, string> = {
  subtle: colors.surface.card,
  elevated: colors.surface.cardElevated,
  strong: colors.surface.cardStrong,
  grouped: colors.surface.card,
  light: colors.surface.light,
  night: 'rgba(255,255,255,0.07)',
};

export function PillowCard({ children, padding = 'standard', style, testID, variant = 'subtle' }: PillowCardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'grouped' || variant === 'light' || variant === 'night' ? styles.large : null,
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
  base: { borderRadius: radius.card, overflow: 'hidden' },
  compact: { padding: space[3] },
  large: { borderRadius: radius.cardLarge },
  standard: { padding: space[4] },
});
