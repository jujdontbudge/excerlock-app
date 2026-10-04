import Svg, { Path } from 'react-native-svg';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { paths } from './paths';
import { controls as c } from './controlsCopy';
export function BackButton({
  onPress,
  label = c.back,
  disabled = false,
  testID,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      label={label}
      testID={testID}
      onPress={onPress}
      haptic="select"
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={{ width: t.icon.md, height: t.control.inline, alignItems: 'center', justifyContent: 'center' }}>
      <Svg accessible={false} width={t.icon.md} height={t.icon.md} viewBox="0 0 24 24">
        <Path
          d={paths.back}
          fill="none"
          stroke={disabled ? t.state.disabledText : t.brand.primary}
          strokeWidth={t.stroke.glyph}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </PressableScale>
  );
}
