import { requireNativeViewManager } from "expo-modules-core";
import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type GaitVisionPreviewProps = Readonly<{
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export default requireNativeViewManager<GaitVisionPreviewProps>(
  "ExcerlockGaitVision",
) as ComponentType<GaitVisionPreviewProps>;
