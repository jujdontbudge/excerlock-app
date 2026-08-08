import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, space, type } from './tokens';

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

export function SwitchRow({ disabled = false, leading, onValueChange, style, subtitle, testID, title, value }: SwitchRowProps) {
  return (
    <View style={[styles.row, disabled && styles.disabled, style]}>
      {leading}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityRole="switch"
        disabled={disabled}
        ios_backgroundColor="rgba(255,255,255,0.18)"
        onValueChange={onValueChange}
        testID={testID}
        thumbColor={colors.surface.light}
        trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.semantic.success }}
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
    minHeight: 64,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  subtitle: { ...type.caption, color: colors.text.secondary, marginTop: space[1] },
  title: { ...type.cardTitle, color: colors.text.primary },
});
