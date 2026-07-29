import { Image, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

import { glyphs, type GlyphName } from "./manifest";

const SOURCE_SIZE = 1024;

type GlyphProps = {
  name: GlyphName;
  /** Rendered width in pt. Height follows the glyph's own aspect ratio. */
  size: number;
  /** Tint applied at render — the assets themselves are always white. */
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Draws one foundry glyph cropped to its alpha bounding box, so `size` means the
 * ink's width rather than the padded canvas's.
 */
export function Glyph({ name, size, color, style, testID }: GlyphProps) {
  const { source, crop } = glyphs[name];
  const [left, top, right, bottom] = crop;
  const width = size;
  const height = (size * (bottom - top)) / (right - left);
  const scaleX = width / (right - left);
  const scaleY = height / (bottom - top);

  return (
    <View testID={testID} style={[{ width, height, overflow: "hidden" }, style]}>
      <Image
        testID={testID === undefined ? undefined : `${testID}-image`}
        source={source}
        resizeMode="stretch"
        tintColor={color}
        style={{
          position: "absolute",
          left: -left * scaleX,
          top: -top * scaleY,
          width: SOURCE_SIZE * scaleX,
          height: SOURCE_SIZE * scaleY,
        }}
      />
    </View>
  );
}
