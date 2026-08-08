import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { colors, space, type } from './tokens';

export interface SettingsRowProps {
  accessibilityLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  testID?: string;
  title: string;
  tone?: 'dark' | 'light';
  trailing?: ReactNode;
  value?: string;
}

export function SettingsRow({
  accessibilityLabel,
  destructive = false,
  disabled = false,
  leading,
  onPress,
  showChevron = Boolean(onPress),
  style,
  subtitle,
  testID,
  title,
  tone = 'dark',
  trailing,
  value,
}: SettingsRowProps) {
  const row = (
    <View style={[styles.row, style]}>
      {leading}
      <View style={styles.copy}>
        <Text style={[styles.title, tone === 'light' && styles.titleLight, destructive && styles.danger]}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={[styles.subtitle, tone === 'light' && styles.secondaryLight]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={[styles.value, tone === 'light' && styles.secondaryLight]}>{value}</Text> : null}
      {trailing}
      {showChevron ? <Text accessibilityElementsHidden style={[styles.chevron, tone === 'light' && styles.secondaryLight]}>›</Text> : null}
    </View>
  );

  if (!onPress) {
    return <View style={disabled && styles.disabled} testID={testID}>{row}</View>;
  }

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      contentStyle={styles.pressContent}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.98}
      style={styles.pressHost}
      testID={testID}
    >
      {row}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chevron: { color: colors.text.tertiary, fontSize: 28, fontWeight: '300', lineHeight: 30 },
  copy: { flex: 1, minWidth: 0 },
  danger: { color: colors.text.danger },
  disabled: { opacity: 0.45 },
  pressContent: { justifyContent: 'center' },
  pressHost: { alignSelf: 'stretch' },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  secondaryLight: { color: colors.text.ink, opacity: 0.68 },
  subtitle: { ...type.caption, color: colors.text.secondary, marginTop: space[1] },
  title: { ...type.cardTitle, color: colors.text.primary },
  titleLight: { color: colors.text.ink },
  value: { ...type.body, color: colors.text.secondary, flexShrink: 1, textAlign: 'right' },
});
