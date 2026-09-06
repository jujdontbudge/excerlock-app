import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, layout, space, type } from './tokens';

export interface SwitchRowProps {
  disabled?: boolean;
  leading?: ReactNode;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  testID?: string;
  title: string;
  value: boolean;
}

export function SwitchRow({ disabled = false, leading, onValueChange, style, testID, title, value }: SwitchRowProps) {
  return (
    <View style={[styles.row, disabled && styles.disabled, style]}>
      {leading}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityRole="switch"
        disabled={disabled}
        ios_backgroundColor={colors.surface.bubbleBorder}
        onValueChange={onValueChange}
        testID={testID}
        thumbColor={colors.surface.light}
        trackColor={{ false: colors.surface.bubbleBorder, true: colors.semantic.success }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.45 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
    minHeight: layout.rowHeight,
    paddingHorizontal: 0,
    paddingVertical: space[2],
  },
  title: { ...type.cardTitle, color: colors.text.primary },
});
