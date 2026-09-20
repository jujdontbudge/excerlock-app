import { Text, TextProps } from 'react-native';
import { tokens as t } from './tokens';
import { useSolidChoices } from './ChoiceAppearance';
export function Label({
  variant = 'body',
  tone = 'primary',
  style,
  ...props
}: TextProps & { variant?: keyof typeof t.type; tone?: keyof typeof t.text }) {
  const onboarding = useSolidChoices();
  return (
    <Text
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={variant === 'body' ? t.a11y.bodyScale : t.a11y.textScale}
      style={[
        t.type[variant],
        { color: t.text[tone], fontVariant: ['tabular-nums'] },
        style,
        onboarding ? { width: '100%', textAlign: 'center' } : null,
      ]}
    />
  );
}
