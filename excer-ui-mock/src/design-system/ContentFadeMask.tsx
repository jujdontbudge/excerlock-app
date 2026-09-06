import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CONTENT_FADE_LENGTH,
  CONTENT_FADE_STOPS,
  getContentHiddenHeight,
} from './dockGeometry';

export interface ContentFadeMaskProps extends PropsWithChildren {
  active?: boolean;
}

/**
 * Content-alpha ramp only — it never paints color over the live background.
 * White in the mask = visible content; transparent = dissolved content.
 */
export const CONTENT_FADE_COLORS = CONTENT_FADE_STOPS.map(
  (stop) => `rgba(255,255,255,${stop.alpha})`,
) as [string, string, ...string[]];
export const CONTENT_FADE_PROGRESS = CONTENT_FADE_STOPS.map(
  (stop) => stop.location,
) as unknown as [number, number, ...number[]];

export function ContentFadeMask({ children, active = true }: ContentFadeMaskProps) {
  const insets = useSafeAreaInsets();
  const hiddenHeight = getContentHiddenHeight(insets.bottom);

  if (!active) return <>{children}</>;

  return (
    <MaskedView
      maskElement={(
        <View style={styles.maskElement} testID="content-fade-alpha-mask">
          <View style={styles.opaqueRegion} testID="content-fade-opaque-region" />
          <LinearGradient
            colors={CONTENT_FADE_COLORS}
            end={{ x: 0.5, y: 1 }}
            locations={CONTENT_FADE_PROGRESS}
            start={{ x: 0.5, y: 0 }}
            style={styles.fadeRegion}
            testID="content-fade-gradient"
          />
          <View
            style={[styles.hiddenRegion, { height: hiddenHeight }]}
            testID="content-fade-hidden-region"
          />
        </View>
      )}
      style={styles.mask}
      testID="content-fade-mask"
    >
      {children}
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  fadeRegion: { height: CONTENT_FADE_LENGTH },
  hiddenRegion: { backgroundColor: 'transparent' },
  mask: { flex: 1 },
  maskElement: { flex: 1 },
  opaqueRegion: { backgroundColor: 'white', flex: 1 },
});
