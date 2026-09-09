import { memo } from 'react';
import { type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { LocalSvg } from 'react-native-svg/css';

export interface VectorIconProps {
  accessibilityLabel?: string;
  color?: string;
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const VectorIcon = memo(function VectorIcon({
  accessibilityLabel,
  color,
  source,
  style,
  testID,
}: VectorIconProps) {
  return (
    <LocalSvg
      accessible={Boolean(accessibilityLabel)}
      accessibilityElementsHidden={!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      asset={source}
      color={color}
      height="100%"
      pointerEvents="none"
      style={style}
      testID={testID}
      width="100%"
    />
  );
});
