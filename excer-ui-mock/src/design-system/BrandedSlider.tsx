import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from './tokens';

export interface BrandedSliderProps {
  accessibilityLabel: string;
  displayValue: string;
  maximumLabel: string;
  maximumValue: number;
  minimumLabel: string;
  minimumValue: number;
  onChange: (value: number) => void;
  step: number;
  testID?: string;
  value: number;
}

/**
 * The single-value slider used by onboarding choice screens. It keeps the
 * current answer visually dominant and exposes explicit increment/decrement
 * actions for VoiceOver in addition to the native drag gesture.
 */
export function BrandedSlider({
  accessibilityLabel,
  displayValue,
  maximumLabel,
  maximumValue,
  minimumLabel,
  minimumValue,
  onChange,
  step,
  testID,
  value,
}: BrandedSliderProps) {
  const updateBy = (direction: -1 | 1) => {
    onChange(Math.min(maximumValue, Math.max(minimumValue, value + direction * step)));
  };

  return (
    <View style={styles.container}>
      <Text accessibilityLiveRegion="polite" style={styles.value}>{displayValue}</Text>
      <Slider
        accessible
        accessibilityActions={[
          { label: 'Decrease', name: 'decrement' },
          { label: 'Increase', name: 'increment' },
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{
          max: maximumValue,
          min: minimumValue,
          now: value,
          text: displayValue,
        }}
        maximumTrackTintColor={colors.surface.trackDark}
        maximumValue={maximumValue}
        minimumTrackTintColor={colors.surface.light}
        minimumValue={minimumValue}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'decrement') updateBy(-1);
          if (event.nativeEvent.actionName === 'increment') updateBy(1);
        }}
        onValueChange={onChange}
        step={step}
        style={styles.slider}
        tapToSeek
        testID={testID}
        thumbTintColor={colors.surface.light}
        value={value}
      />
      <View style={styles.labels}>
        <Text style={styles.endpoint}>{minimumLabel}</Text>
        <Text style={styles.endpoint}>{maximumLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: space[2], width: '100%' },
  endpoint: { ...type.label, color: colors.text.primary },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  slider: { alignSelf: 'stretch', height: 48, width: '100%' },
  value: { ...type.heroLg, color: colors.text.primary, textAlign: 'center' },
});
