import { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Reveal } from '../motion/Reveal';
export function TextField({
  label,
  error,
  hideLabel = false,
  ...props
}: TextInputProps & { label: string; error?: string; hideLabel?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: t.space.sm }}>
      {!hideLabel ? (
        <Label variant="support" tone="secondary">
          {label}
        </Label>
      ) : null}
      <Animated.View
        style={{
          backgroundColor: t.surface.subtle,
          borderRadius: t.radius.field,
          borderWidth: t.stroke.selected,
          borderColor: error ? t.state.error : focused ? t.brand.primary : t.surface.subtle,
          transitionProperty: 'borderColor',
          transitionDuration: t.motion.duration.fast,
        }}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={error}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={t.text.muted}
          selectionColor={t.brand.primary}
          allowFontScaling
          maxFontSizeMultiplier={t.a11y.bodyScale}
          style={[
            t.type.body,
            {
              minHeight: t.layout.field,
              color: t.text.primary,
              paddingHorizontal: t.space.lg,
              paddingVertical: t.space.md,
            },
            props.style,
          ]}
        />
      </Animated.View>
      {error ? (
        <Reveal>
          <Label accessibilityRole="alert" variant="support" style={{ color: t.state.error }}>
            {error}
          </Label>
        </Reveal>
      ) : null}
    </View>
  );
}
