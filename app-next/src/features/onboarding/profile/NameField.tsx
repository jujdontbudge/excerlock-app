import { useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { onboardingLabels as c } from '../../../content/onboarding';
import { Reveal } from '../../../motion/Reveal';
export function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false),
    error = value.trim().length > 30;
  return (
    <View style={{ gap: t.space.sm }}>
      <Animated.View
        style={{
          borderRadius: p.field.radius,
          borderWidth: t.stroke.hairline,
          borderColor: error ? t.state.error : focused ? t.brand.primary : p.colors.line,
          backgroundColor: p.colors.row,
          transitionProperty: 'borderColor',
          transitionDuration: t.motion.duration.fast,
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
            minHeight: p.field.height,
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
