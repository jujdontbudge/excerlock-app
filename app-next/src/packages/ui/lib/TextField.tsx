import { useState } from 'react';
import { Keyboard, TextInput, TextInputProps, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { useMotion } from '../useMotion';
export function TextField({
  label,
  hideLabel = false,
  labelTone = 'secondary',
  centered = false,
  ...props
}: TextInputProps & {
  label: string;
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
          backgroundColor: t.surface.softChoice,
          borderRadius: t.radius.field,
          borderWidth: t.stroke.selected,
          borderColor: focused ? t.brand.primary : t.surface.transparent,
          ...m.transition('borderColor', 'standard'),
        }}>
        <TextInput
          {...props}
          accessibilityLabel={label}
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
          returnKeyType={props.keyboardType === 'number-pad' || props.keyboardType === 'decimal-pad' ? undefined : props.returnKeyType ?? (props.multiline ? 'default' : 'done')}
          onSubmitEditing={props.onSubmitEditing ?? (props.multiline ? undefined : Keyboard.dismiss)}
          allowFontScaling
          maxFontSizeMultiplier={t.a11y.textScale}
          style={[
            t.type.body,
            {
              minHeight: t.control.full,
              color: t.text.primary,
              paddingHorizontal: t.space.lg,
              paddingVertical: props.multiline ? t.space.md : 0,
              textAlignVertical: props.multiline ? 'top' : 'center',
            },
            !props.multiline && { height: t.control.full, lineHeight: undefined },
            centered && { textAlign: 'center' },
            props.style,
            !props.multiline && { lineHeight: undefined, paddingVertical: 0 },
          ]}
        />
      </Animated.View>
    </View>
  );
}
