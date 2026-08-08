import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { colors, radius, space, type } from './tokens';

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
  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup" style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: option.disabled }}
            contentStyle={[styles.segment, selected && styles.selected]}
            disabled={option.disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            pressedScale={0.98}
            style={styles.segmentHost}
          >
            <Text style={[styles.label, selected ? styles.selectedLabel : styles.unselectedLabel]}>{option.label}</Text>
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
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: space[2],
  },
  segmentHost: { flex: 1 },
  selected: { backgroundColor: colors.surface.light },
  selectedLabel: { color: colors.text.ink },
  track: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.sm,
    flexDirection: 'row',
    minHeight: 44,
    padding: 2,
  },
  unselectedLabel: { color: colors.text.secondary },
});
