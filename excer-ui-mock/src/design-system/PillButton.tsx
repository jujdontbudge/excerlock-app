import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { colors, radius, space, type } from './tokens';

export type PillButtonVariant = 'screen' | 'primary' | 'energy' | 'secondary' | 'dark' | 'destructive' | 'text';

export interface PillButtonProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  success?: boolean;
  testID?: string;
  variant?: PillButtonVariant;
}

const variantStyle: Record<PillButtonVariant, { backgroundColor: string; color: string }> = {
  screen: { backgroundColor: colors.surface.light, color: colors.text.ink },
  primary: { backgroundColor: colors.brand.primary, color: colors.text.ink },
  energy: { backgroundColor: colors.brand.energyAction, color: colors.text.primary },
  secondary: { backgroundColor: 'rgba(255,255,255,0.10)', color: colors.text.primary },
  dark: { backgroundColor: colors.surface.cardStrong, color: colors.text.primary },
  destructive: { backgroundColor: colors.semantic.dangerAction, color: colors.text.primary },
  text: { backgroundColor: 'transparent', color: colors.text.primary },
};

export function PillButton({
  accessibilityLabel,
  disabled = false,
  fullWidth = false,
  icon,
  label,
  loading = false,
  loadingLabel = 'Please wait…',
  onPress,
  style,
  success = false,
  testID,
  variant = 'primary',
}: PillButtonProps) {
  const palette = variantStyle[variant];
  const blocked = disabled || loading || success || !onPress;
  const visuallyDisabled = disabled || !onPress;

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked }}
      disabled={blocked}
      disabledOpacity={visuallyDisabled ? 0.45 : 1}
      onPress={onPress}
      pressedScale={variant === 'screen' ? 0.97 : 0.96}
      style={[fullWidth && styles.fullWidth, style]}
      testID={testID}
    >
      <View style={[styles.button, { backgroundColor: palette.backgroundColor }, fullWidth && styles.fullWidth]}>
        {loading ? <ActivityIndicator color={palette.color} size="small" /> : null}
        {!loading && success ? <Text style={[styles.iconText, { color: palette.color }]}>✓</Text> : null}
        {!loading && !success ? icon : null}
        <Text style={[styles.label, { color: visuallyDisabled ? colors.text.disabled : palette.color }]}>
          {loading ? loadingLabel : label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space[2],
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: space[6],
  },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  iconText: { ...type.button },
  label: { ...type.button, textAlign: 'center' },
});
