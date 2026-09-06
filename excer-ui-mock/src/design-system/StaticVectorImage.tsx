import { Image } from 'expo-image';
import { memo } from 'react';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

export interface StaticVectorImageProps {
  accessibilityLabel?: string;
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

/**
 * Native-decoded SVG image for dense, non-interactive vector artwork.
 * Unlike LocalSvg, this does not expand thousands of paths into native views.
 */
export const StaticVectorImage = memo(function StaticVectorImage({
  accessibilityLabel,
  source,
  style,
  testID,
}: StaticVectorImageProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      contentFit="contain"
      source={source}
      style={style}
      testID={testID}
      transition={0}
    />
  );
});
