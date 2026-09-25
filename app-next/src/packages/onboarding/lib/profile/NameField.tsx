import { useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { onboardingLabels as c } from '../onboardingCopy';
import { Reveal } from '../../../ui/Reveal';
import { useMotion } from '../../../ui/useMotion';
export function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const m = useMotion();
  const [focused, setFocused] = useState(false),
    error = value.trim().length > 30;
  return (
    <View style={{ gap: t.space.sm }}>
      <Animated.View
        style={{
          borderRadius: t.radius.field,
          borderWidth: t.stroke.hairline,
          borderColor: error ? t.state.error : focused ? t.brand.primary : t.border.outline,
          backgroundColor: t.surface.card,
          ...m.transition('borderColor', 'standard'),
        }}>
        <TextInput
          accessibilityLabel={c.name}
          placeholder={c.name}
          autoFocus={false}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={t.brand.primary}
          placeholderTextColor={t.text.secondary}
          maxFontSizeMultiplier={t.a11y.textScale}
          style={{
            ...t.type.body,
            color: t.text.primary,
            minHeight: t.control.full,
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.md,
          }}
        />
      </Animated.View>
      {error ? (
        <Reveal>
          <Label accessibilityRole="alert" variant="support" style={{ color: t.state.error }}>
            {c.nameError}
          </Label>
        </Reveal>
      ) : null}
    </View>
  );
}
