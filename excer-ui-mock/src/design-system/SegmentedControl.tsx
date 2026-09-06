import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion, type CSSStyle } from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { colors, layout, motion, radius, space, type } from './tokens';

export interface SegmentOption<T extends string = string> {
  disabled?: boolean;
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string = string> {
  accessibilityLabel: string;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  style?: StyleProp<ViewStyle>;
  value: T;
}

export function SegmentedControl<T extends string>({ accessibilityLabel, onChange, options, style, value }: SegmentedControlProps<T>) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : motion.duration.fast;
  const timing = cubicBezier(0.16, 1, 0.3, 1);
  const textTransition: CSSStyle<TextStyle> = {
    transitionDuration: duration,
    transitionProperty: 'color',
    transitionTimingFunction: timing,
  };

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup" style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: option.disabled }}
            contentStyle={[
              styles.segment,
              selected ? styles.selected : styles.unselected,
              {
                transitionDuration: duration,
                transitionProperty: ['backgroundColor', 'borderColor'],
                transitionTimingFunction: timing,
              },
            ]}
            disabled={option.disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            pressedScale={0.98}
            style={styles.segmentHost}
          >
            <Animated.Text
              style={[
                styles.label,
                selected ? styles.selectedLabel : styles.unselectedLabel,
                textTransition,
              ]}
            >
              {option.label}
            </Animated.Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, textAlign: 'center' },
  segment: {
    alignItems: 'center',
    borderRadius: radius.control,
    flex: 1,
    justifyContent: 'center',
    minHeight: layout.controlHeightCompact,
    paddingHorizontal: space[2],
  },
  segmentHost: { flex: 1 },
  selected: { backgroundColor: colors.surface.light },
  selectedLabel: { color: colors.brand.primary },
  track: {
    backgroundColor: colors.surface.bubble,
    borderRadius: radius.control,
    flexDirection: 'row',
    minHeight: layout.controlHeight,
    padding: 2,
  },
  unselected: { backgroundColor: 'transparent', borderColor: 'transparent' },
  unselectedLabel: { color: colors.text.primary },
});
