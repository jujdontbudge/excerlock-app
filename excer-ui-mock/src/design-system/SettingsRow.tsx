import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { SelectableBubble } from './SelectableBubble';
import { ChevronIcon } from './ChevronIcon';
import { colors, iconSize, layout, space, type } from './tokens';
export interface SettingsRowProps {
  accessibilityLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
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
  selected,
  showChevron = Boolean(onPress),
  style,
  testID,
  title,
  tone = 'dark',
  trailing,
  value,
}: SettingsRowProps) {
  if (typeof selected === 'boolean' && onPress) {
    const selectionTrailing = trailing ?? (value ? (
      <Text numberOfLines={1} style={[styles.value, selected && styles.selectedValue]}>{value}</Text>
    ) : undefined);

    return (
      <SelectableBubble
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        fullWidth
        label={title}
        leading={leading}
        onPress={onPress}
        selected={selected}
        style={style}
        testID={testID}
        trailing={selectionTrailing}
      />
    );
  }

  const row = (
    <View style={[styles.row, tone === 'light' && styles.rowLight, style]}>
      {leading}
      <View style={styles.copy}>
        <Text style={[styles.title, tone === 'light' && styles.titleLight, destructive && styles.danger]}>{title}</Text>
      </View>
      {value ? <Text numberOfLines={1} style={[styles.value, tone === 'light' && styles.secondaryLight]}>{value}</Text> : null}
      {trailing}
      {showChevron ? (
        <View accessibilityElementsHidden style={styles.chevron}>
          <ChevronIcon size={iconSize.inline} />
        </View>
      ) : null}
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
  chevron: { height: iconSize.inline, opacity: 1, width: iconSize.inline },
  copy: { flex: 1, minWidth: 0 },
  danger: { color: colors.text.danger },
  disabled: { opacity: 0.45 },
  pressContent: { justifyContent: 'center' },
  pressHost: { alignSelf: 'stretch' },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
    minHeight: layout.rowHeight,
    paddingHorizontal: 0,
    paddingVertical: space[2],
  },
  rowLight: { paddingHorizontal: space[4] },
  secondaryLight: { color: colors.text.ink },
  selectedValue: { color: colors.brand.primary },
  title: { ...type.cardTitle, color: colors.text.primary },
  titleLight: { color: colors.text.ink },
  value: { ...type.body, color: colors.text.secondary, flexShrink: 1, textAlign: 'right' },
});
