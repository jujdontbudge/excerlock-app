import type { ColorValue } from "react-native";

import { Glyph, type GlyphName } from "../icons";

type TabBarIconProps = {
  icon: GlyphName;
  /** Supplied by the navigator: active or inactive tint. */
  color: ColorValue;
  size?: number;
  testID?: string;
};

const TAB_GLYPH_SIZE = 26;

/** One tab's white glyph, tinted to the navigator's active/inactive colour. */
export function TabBarIcon({ icon, color, size = TAB_GLYPH_SIZE, testID }: TabBarIconProps) {
  return <Glyph name={icon} size={size} color={color} testID={testID} />;
}
