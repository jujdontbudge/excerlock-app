import { StyleSheet, Text, TextProps, useWindowDimensions } from 'react-native';
import { tokens as t } from './tokens';
import { useSetupPresentation } from './SetupPresentation';

const { ascent, descent, capHeight } = t.fontMetrics;

export function capShift(fontSize: number, lineHeight: number) {
  return lineHeight < (ascent + descent) * fontSize
    ? (descent + capHeight / 2) * fontSize - lineHeight / 2
    : ((capHeight - ascent + descent) * fontSize) / 2;
}

export function useCapShift(fontSize: number, lineHeight: number) {
  const { fontScale } = useWindowDimensions();
  return capShift(fontSize, lineHeight) * Math.min(fontScale, t.a11y.textScale);
}

export function useInputType(variant: keyof typeof t.type) {
  const { lineHeight, ...type } = t.type[variant];
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, t.a11y.textScale);
  return {
    ...type,
    lineHeight: undefined,
    height: lineHeight * scale,
    paddingTop: 2 * capShift(type.fontSize, (ascent + descent) * type.fontSize) * scale,
  };
}

export function Label({
  variant = 'body',
  tone = 'primary',
  style,
  ...props
}: TextProps & { variant?: keyof typeof t.type; tone?: keyof typeof t.text }) {
  const flat = StyleSheet.flatten(style);
  const onboarding = useSetupPresentation() && flat?.position !== 'absolute';
  const type = t.type[variant];
  const shift = useCapShift(flat?.fontSize ?? type.fontSize, flat?.lineHeight ?? type.lineHeight);
  return (
    <Text
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={t.a11y.textScale}
      style={[
        type,
        { color: t.text[tone], fontVariant: ['tabular-nums'] },
        style,
        onboarding ? { alignSelf: flat?.alignSelf ?? 'stretch', textAlign: flat?.textAlign ?? 'center' } : null,
        { transform: [...(Array.isArray(flat?.transform) ? flat.transform : []), { translateY: shift }] },
      ]}
    />
  );
}
