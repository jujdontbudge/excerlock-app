import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion, type CSSStyle } from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { colors, layout, motion, radius, space, type } from './tokens';

export interface SelectableBubbleProps {
  accessibilityLabel?: string;
  compact?: boolean;
  contentStyle?: StyleProp<CSSStyle<ViewStyle>>;
  disabled?: boolean;
  fullWidth?: boolean;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  leading?: ReactNode;
  onPress: () => void;
  role?: 'button' | 'checkbox' | 'radio';
  selected: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  testID?: string;
  trailing?: ReactNode;
}

/**
 * GO Club-style option: a quiet translucent bubble at rest that smoothly
 * inverts to a white surface with blue copy when selected.
 */
export function SelectableBubble({
  accessibilityLabel,
  compact = false,
  contentStyle,
  disabled = false,
  fullWidth = false,
  label,
  labelStyle,
  leading,
  onPress,
  role = 'button',
  selected,
  style,
  testID,
  trailing,
}: SelectableBubbleProps) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : motion.duration.fast;
  const timing = cubicBezier(0.16, 1, 0.3, 1);
  const textTransition: CSSStyle<TextStyle> = {
    transitionDuration: duration,
    transitionProperty: 'color',
    transitionTimingFunction: timing,
  };
  const state = role === 'radio' || role === 'checkbox'
    ? { checked: selected, disabled, selected }
    : { selected, disabled };

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? `${label}${selected ? ', selected' : ''}`}
      accessibilityRole={role}
      accessibilityState={state}
      contentStyle={[
        styles.bubble,
        compact && styles.compact,
        fullWidth && styles.fullWidth,
        contentStyle,
        selected ? styles.selected : styles.resting,
        {
          transitionDuration: duration,
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionTimingFunction: timing,
        },
      ]}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.98}
      style={[fullWidth && styles.fullWidth, style]}
      testID={testID}
    >
      <View style={[styles.row, compact && styles.compactRow]}>
        {leading}
        <View style={[styles.copy, compact && styles.compactCopy]}>
          <Animated.Text
            style={[
              styles.label,
              compact && styles.compactLabel,
              labelStyle,
              selected ? styles.selectedCopy : styles.restingCopy,
              textTransition,
            ]}
          >
            {label}
          </Animated.Text>
        </View>
        {trailing}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  compact: {
    borderRadius: radius.control,
    minHeight: layout.controlHeightCompact,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  compactCopy: { alignItems: 'center', flex: 0 },
  compactLabel: { ...type.label },
  compactRow: { justifyContent: 'center' },
  copy: { flex: 1, gap: space[1], minWidth: 0 },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  label: { ...type.cardTitle },
  resting: {
    backgroundColor: colors.surface.bubble,
    borderColor: colors.surface.bubbleBorder,
  },
  restingCopy: { color: colors.text.primary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  selected: {
    backgroundColor: colors.surface.light,
    borderColor: colors.surface.light,
  },
  selectedCopy: { color: colors.brand.primary },
});
