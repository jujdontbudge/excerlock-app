import Svg, { Path } from 'react-native-svg';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { profileTokens as p } from './profileTokens';
import { paths } from '../icons/paths';
import { controls as c } from '../content/controls';
/** The one back affordance: a brand-orange chevron on a 44pt target, top left. */
export function BackButton({
  onPress,
  label = c.back,
  disabled = false,
  testID,
}: {
  onPress: () => void;
  /** A more specific spoken destination, such as "Back to search". */
  label?: string;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      label={label}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={{ width: t.control.inline, height: t.control.inline, alignItems: 'center', justifyContent: 'center' }}>
      <Svg accessible={false} width={p.header.arrow} height={p.header.arrow} viewBox="0 0 24 24">
        <Path
          d={paths.back}
          fill="none"
          stroke={disabled ? t.state.disabledText : t.brand.primary}
          strokeWidth={p.header.arrowStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </PressableScale>
  );
}
