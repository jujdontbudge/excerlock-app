import { forwardRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Screen, useTheme } from "@/ui";

import {
  SHARE_CARD_FORMATS,
  type ShareCardRatio,
} from "../ShareCardFormat";

type ShareCardFrameProps = Readonly<{
  children: ReactNode;
  ratio: ShareCardRatio;
}>;

/**
 * The capture target shared by every template. It uses the app's governed
 * gradient surface and exposes only the two export geometries in PRD §3.13.
 */
export const ShareCardFrame = forwardRef<View, ShareCardFrameProps>(
  function ShareCardFrame({ children, ratio }, ref) {
    const { radius, spacing } = useTheme();

    return (
      <View
        ref={ref}
        testID="share-card-canvas"
        accessibilityLabel={`${ratio} share card`}
        style={[
          styles.canvas,
          {
            aspectRatio: SHARE_CARD_FORMATS[ratio].aspectRatio,
            borderRadius: radius.lg,
          },
        ]}
      >
        <Screen
          edges={[]}
          style={[styles.content, { padding: spacing.lg }]}
        >
          {children}
        </Screen>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  canvas: { overflow: "hidden", width: "100%" },
  content: { justifyContent: "space-between" },
});
