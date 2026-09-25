import { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { Reveal } from '../Reveal';
import { useMotion } from '../useMotion';
export function TextField({
  label,
  error,
  hideLabel = false,
  labelTone = 'secondary',
  centered = false,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  hideLabel?: boolean;
  labelTone?: 'primary' | 'secondary';
  centered?: boolean;
}) {
  const m = useMotion();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: t.space.md }}>
      {!hideLabel ? (
        <Label
          variant={centered ? 'label' : 'support'}
          tone={centered ? 'primary' : labelTone}
          style={centered ? { textAlign: 'center' } : undefined}>
          {label}
        </Label>
      ) : null}
      <Animated.View
        style={{
          backgroundColor: t.surface.card,
          borderRadius: t.radius.field,
          borderWidth: t.stroke.selected,
          borderColor: error ? t.state.error : focused ? t.brand.primary : t.border.outline,
          ...m.transition('borderColor', 'standard'),
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
          placeholderTextColor={t.text.secondary}
          selectionColor={t.brand.primary}
          allowFontScaling
          maxFontSizeMultiplier={t.a11y.textScale}
          style={[
            t.type.body,
            {
              minHeight: t.control.full,
              color: t.text.primary,
              paddingHorizontal: t.space.lg,
              paddingVertical: t.space.lg,
            },
            centered && { textAlign: 'center' },
            props.style,
          ]}
        />
      </Animated.View>
      {error ? (
        <Reveal>
          <Label
            accessibilityRole="alert"
            variant="support"
            style={{ color: t.state.error, textAlign: centered ? 'center' : undefined }}>
            {error}
          </Label>
        </Reveal>
      ) : null}
    </View>
  );
}
