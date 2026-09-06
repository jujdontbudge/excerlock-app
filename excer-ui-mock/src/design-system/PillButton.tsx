import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { colors, layout, motion, radius, space, type } from './tokens';

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
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  success?: boolean;
  testID?: string;
  variant?: PillButtonVariant;
}

const variantStyle: Record<PillButtonVariant, { backgroundColor: string; color: string }> = {
  screen: { backgroundColor: colors.surface.light, color: colors.brand.primary },
  primary: { backgroundColor: colors.brand.primary, color: colors.text.primary },
  energy: { backgroundColor: colors.brand.energyAction, color: colors.text.primary },
  secondary: { backgroundColor: colors.surface.bubble, color: colors.text.primary },
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
  selected,
  style,
  success = false,
  testID,
  variant = 'primary',
}: PillButtonProps) {
  const reduceMotion = useReducedMotion();
  const palette = variantStyle[variant];
  const copyColor = selected ? colors.brand.primary : palette.color;
  const backgroundColor = selected ? colors.surface.light : palette.backgroundColor;
  const blocked = disabled || loading || success || !onPress;
  const visuallyDisabled = disabled || !onPress;
  const disabledCopyColor = variant === 'screen' ? colors.brand.primary : colors.text.disabled;
  const duration = reduceMotion ? 0 : motion.duration.fast;
  const timing = cubicBezier(0.16, 1, 0.3, 1);

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked, selected }}
      disabled={blocked}
      disabledOpacity={visuallyDisabled ? 0.45 : 1}
      onPress={onPress}
      pressedScale={variant === 'screen' ? 0.97 : 0.96}
      style={[fullWidth && styles.fullWidth, style]}
      testID={testID}
    >
      <Animated.View style={[
        styles.button,
        variant === 'screen' || variant === 'primary' || variant === 'energy' ? styles.pillAction : null,
        { backgroundColor },
        variant === 'secondary' || variant === 'dark' ? styles.bubble : null,
        selected ? styles.selected : null,
        fullWidth && styles.fullWidth,
        {
          transitionDuration: duration,
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionTimingFunction: timing,
        },
      ]}>
        {loading ? <ActivityIndicator color={copyColor} size="small" /> : null}
        {!loading && success ? <Text style={[styles.iconText, { color: copyColor }]}>✓</Text> : null}
        {!loading && !success ? icon : null}
        <Animated.Text
          style={[
            styles.label,
            { color: visuallyDisabled ? disabledCopyColor : copyColor },
            {
              transitionDuration: duration,
              transitionProperty: 'color',
              transitionTimingFunction: timing,
            },
          ]}
        >
          {loading ? loadingLabel : label}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: space[2],
    justifyContent: 'center',
    minHeight: layout.controlHeight,
    paddingHorizontal: space[6],
  },
  bubble: { borderColor: colors.surface.bubbleBorder, borderWidth: 1 },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  iconText: { ...type.button },
  label: { ...type.button, textAlign: 'center' },
  pillAction: { borderRadius: radius.pill },
  selected: { borderColor: colors.surface.light, borderWidth: 1 },
});
