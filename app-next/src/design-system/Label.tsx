import { Text, TextProps } from 'react-native';
import { tokens as t } from './tokens';
export function Label({
  variant = 'body',
  tone = 'primary',
  style,
  ...props
}: TextProps & { variant?: keyof typeof t.type; tone?: keyof typeof t.text }) {
  return (
    <Text
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={variant === 'body' ? t.a11y.bodyScale : t.a11y.textScale}
      style={[t.type[variant], { color: t.text[tone], fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
