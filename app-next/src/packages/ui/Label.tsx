import { StyleSheet, Text, TextProps } from 'react-native';
import { tokens as t } from './tokens';
import { useSetupPresentation } from './SetupPresentation';
export function Label({
  variant = 'body',
  tone = 'primary',
  style,
  ...props
}: TextProps & { variant?: keyof typeof t.type; tone?: keyof typeof t.text }) {
  const flat = StyleSheet.flatten(style);
  const onboarding = useSetupPresentation() && flat?.position !== 'absolute';
  return (
    <Text
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={t.a11y.textScale}
      style={[
        t.type[variant],
        { color: t.text[tone], fontVariant: ['tabular-nums'] },
        style,
        onboarding ? { alignSelf: flat?.alignSelf ?? 'stretch', textAlign: flat?.textAlign ?? 'center' } : null,
      ]}
    />
  );
}
